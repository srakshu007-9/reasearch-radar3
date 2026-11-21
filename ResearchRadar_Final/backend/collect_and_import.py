"""Collect real scholarly metadata from arXiv, OpenAlex, Crossref and PubMed and upsert into MySQL."""
import os, json, hashlib, re, time
from datetime import datetime
from pathlib import Path
import requests, feedparser, xml.etree.ElementTree as ET
from dotenv import load_dotenv
from database.db_connection import get_connection
BASE=Path(__file__).resolve().parent; load_dotenv(BASE/'.env')
QUERY=os.getenv('COLLECTION_QUERY','artificial intelligence OR machine learning')
LIMIT=max(1,min(500,int(os.getenv('COLLECTION_LIMIT_PER_SOURCE','100'))))
S=requests.Session(); S.headers.update({'User-Agent':'ResearchRadar/1.0 (academic student project; contact: researchradar@example.com)'})

def authors_list(items):
 out=[]
 for x in items or []:
  if isinstance(x,str):out.append(x)
  elif isinstance(x,dict):out.append(x.get('name') or x.get('display_name') or ' '.join(filter(None,[x.get('given'),x.get('family')])))
 return [x for x in out if x]
def year_date(v):
 if not v:return None,None
 try:
  s=str(v); y=int(s[:4]); date=f'{s[:4]}-{s[5:7] if len(s)>6 else "01"}-{s[8:10] if len(s)>9 else "01"}'; datetime.strptime(date,'%Y-%m-%d'); return date,y
 except:return None,None
def canon(p):
 doi=(p.get('doi') or '').lower().replace('https://doi.org/','').strip()
 return 'doi:'+doi if doi else 'title:'+hashlib.sha256(re.sub(r'\W+',' ',p['title'].lower()).encode()).hexdigest()
def get_json(url,params):
 r=S.get(url,params=params,timeout=35); r.raise_for_status(); return r.json()
def collect_arxiv():
 """Use the original CyberNout OAI-PMH harvester and map its records into ResearchRadar."""
 import importlib.util
 harvester_path = BASE / 'scraper' / 'arxiv_oai_harvester.py'
 spec = importlib.util.spec_from_file_location('researchradar_original_arxiv_harvester', harvester_path)
 if spec is None or spec.loader is None:
  raise RuntimeError(f'Could not load original arXiv harvester: {harvester_path}')
 harvester = importlib.util.module_from_spec(spec)
 spec.loader.exec_module(harvester)

 # The original harvester treats MAX_RECORDS as a total target, so continue
 # from the existing unique-ID count and collect up to this run's configured limit.
 existing_ids = harvester.load_existing_ids()
 # Read by identifier after harvesting. Seeking to a byte-size offset in a UTF-8
 # text stream is unsafe because a non-ASCII title can split a character.
 harvester.MAX_RECORDS = len(existing_ids) + LIMIT
 harvester.harvest_arxiv()

 out = []
 if harvester.OUTPUT_FILE.exists():
  with harvester.OUTPUT_FILE.open('r', encoding='utf-8') as f:
   for line in f:
    try:
     item = json.loads(line)
    except json.JSONDecodeError:
     continue
    arxiv_id = item.get('arxiv_id')
    title = (item.get('title') or '').strip()
    if not arxiv_id or not title or arxiv_id in existing_ids:
     continue
    existing_ids.add(arxiv_id)
    out.append({
     'source': 'arXiv',
     'source_id': arxiv_id,
     'doi': item.get('doi') or None,
     'title': title,
     'abstract': item.get('abstract') or '',
     'authors': authors_list(item.get('authors') or []),
     'date': item.get('published') or item.get('updated'),
     'url': item.get('paper_url') or f'https://arxiv.org/abs/{arxiv_id}',
     'pdf_url': item.get('pdf_url') or f'https://arxiv.org/pdf/{arxiv_id}',
     'arxiv_ids': [arxiv_id],
     'keywords': item.get('categories') or []
    })
 return out

def collect_crossref():
 d=get_json('https://api.crossref.org/works',{'query':QUERY,'rows':LIMIT,'select':'DOI,title,abstract,author,published,created,URL,container-title,publisher,type,is-referenced-by-count'}).get('message',{}).get('items',[]); out=[]
 for x in d:
  title=(x.get('title') or [''])[0]
  if not title:continue
  parts=x.get('published',{}).get('date-parts') or x.get('created',{}).get('date-parts') or [[None]]; dp=parts[0]; date='-'.join(str(v).zfill(2) for v in (dp+[1,1])[:3]) if dp and dp[0] else None
  out.append({'source':'Crossref','source_id':x.get('DOI'),'doi':x.get('DOI'),'title':title,'abstract':re.sub('<[^>]+>',' ',x.get('abstract','')),'authors':authors_list(x.get('author')),'date':date,'url':x.get('URL'),'journal':(x.get('container-title') or [''])[0],'publisher':x.get('publisher'),'paper_type':x.get('type'),'citations':x.get('is-referenced-by-count',0)})
 return out
def collect_openalex():
 d=get_json('https://api.openalex.org/works',{'search':QUERY,'per-page':LIMIT,'sort':'publication_date:desc'}).get('results',[]); out=[]
 for x in d:
  inv=(x.get('abstract_inverted_index') or {}); words=[]
  for w,positions in inv.items():words.extend((pos,w) for pos in positions)
  abstract=' '.join(w for _,w in sorted(words))
  out.append({'source':'OpenAlex','source_id':x.get('id'),'openalex_ids':[x.get('id')],'doi':(x.get('doi') or '').replace('https://doi.org/',''),'title':x.get('title') or '','abstract':abstract,'authors':authors_list([a.get('author',{}) for a in x.get('authorships',[])]),'date':x.get('publication_date'),'url':x.get('doi') or x.get('id'),'journal':((x.get('primary_location') or {}).get('source') or {}).get('display_name'),'citations':x.get('cited_by_count',0),'keywords':[k.get('display_name') for k in x.get('keywords',[]) if k.get('display_name')]})
 return [x for x in out if x['title']]
def collect_pubmed():
 r=S.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',params={'db':'pubmed','term':QUERY,'retmax':LIMIT,'sort':'date','retmode':'json'},timeout=35); r.raise_for_status(); ids=r.json().get('esearchresult',{}).get('idlist',[])
 if not ids:return []
 r=S.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',params={'db':'pubmed','id':','.join(ids),'retmode':'xml'},timeout=45); r.raise_for_status(); root=ET.fromstring(r.text); out=[]
 for a in root.findall('.//PubmedArticle'):
  txt=lambda path:' '.join(''.join(e.itertext()).strip() for e in a.findall(path)).strip()
  pmid=txt('.//PMID'); title=txt('.//ArticleTitle')
  if not title:continue
  abstract=txt('.//Abstract/AbstractText'); names=[]
  for au in a.findall('.//Author'):
   n=' '.join(filter(None,[txt1(au,'ForeName'),txt1(au,'LastName')]))
   if n:names.append(n)
  date=txt('.//PubDate/Year') or None
  out.append({'source':'PubMed','source_id':pmid,'pmids':[pmid],'title':title,'abstract':abstract,'authors':names,'date':date,'url':f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/','journal':txt('.//Journal/Title'),'keywords':[x.text for x in a.findall('.//Keyword') if x.text]})
 return out
def txt1(e,path):
 x=e.find(path); return ''.join(x.itertext()).strip() if x is not None else ''
def save(records):
 c=get_connection(); cur=c.cursor(); imported=0; skipped=0
 try:
  for p in records:
   title=(p.get('title') or '').strip()
   if len(title)<5:skipped+=1; continue
   date,year=year_date(p.get('date')); key=canon(p); src=p['source']; sid=str(p.get('source_id') or key)
   cur.execute('''INSERT INTO papers(canonical_id,title,abstract,doi,arxiv_ids,pmids,openalex_ids,authors,keywords,journal,publisher,publication_date,publication_year,paper_type,citation_count,sources,paper_url,pdf_url) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE title=IF(VALUES(title)='',title,VALUES(title)),abstract=IF(VALUES(abstract)='',abstract,VALUES(abstract)),citation_count=GREATEST(citation_count,VALUES(citation_count))''',(key,title,p.get('abstract'),p.get('doi'),json.dumps(p.get('arxiv_ids',[])),json.dumps(p.get('pmids',[])),json.dumps(p.get('openalex_ids',[])),json.dumps(p.get('authors',[])),json.dumps(p.get('keywords',[])),p.get('journal'),p.get('publisher'),date,year,p.get('paper_type'),int(p.get('citations') or 0),json.dumps([src]),p.get('url'),p.get('pdf_url')))
   cur.execute('SELECT id,sources FROM papers WHERE canonical_id=%s',(key,)); row=cur.fetchone(); pid=row[0]; sources=json.loads(row[1]) if isinstance(row[1],str) else (row[1] or [])
   if src not in sources:sources.append(src); cur.execute('UPDATE papers SET sources=%s WHERE id=%s',(json.dumps(sources),pid))
   cur.execute('INSERT IGNORE INTO paper_sources(paper_id,source,source_record_id,doi,source_url,source_metadata) VALUES(%s,%s,%s,%s,%s,%s)',(pid,src,sid,p.get('doi'),p.get('url'),json.dumps(p,ensure_ascii=False,default=str)))
   imported+=1
  c.commit(); return imported,skipped
 except:c.rollback(); raise
 finally:cur.close();c.close()
def main():
 summary={'query':QUERY,'limit_per_source':LIMIT,'sources':{},'total_processed':0,'total_skipped':0}
 for name,fn in [('arXiv',collect_arxiv),('OpenAlex',collect_openalex),('Crossref',collect_crossref),('PubMed',collect_pubmed)]:
  try:
   rows=fn(); ok,skip=save(rows); summary['sources'][name]={'fetched':len(rows),'processed':ok,'skipped':skip,'status':'ok'}; summary['total_processed']+=ok; summary['total_skipped']+=skip
  except Exception as e:summary['sources'][name]={'status':'error','error':str(e)}
  print(name,summary['sources'][name])
 out=BASE/'data'/'last_collection.json'; out.parent.mkdir(exist_ok=True); out.write_text(json.dumps(summary,indent=2),encoding='utf-8'); print(json.dumps(summary,indent=2))
 if not summary['total_processed']:raise SystemExit('No papers imported. Check network, database and source errors above.')
if __name__=='__main__':main()

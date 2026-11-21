import json
from database.db_connection import get_connection

def unpack(v):
 if isinstance(v,list):return v
 try:return json.loads(v) if v else []
 except:return []
def maprow(row):
 for k in ('authors','keywords','sources','arxiv_ids','pmids','openalex_ids'):row[k]=unpack(row.get(k))
 if row.get('publication_date'):row['publication_date']=str(row['publication_date'])
 return row

def search_papers(q=None,author=None,source=None,year_from=None,year_to=None,paper_type=None,journal=None,sort='newest',page=1,limit=20):
 c=get_connection(); cur=c.cursor(dictionary=True); cond=[]; vals=[]
 if q: cond.append('(title LIKE %s OR abstract LIKE %s OR keywords LIKE %s)'); vals += [f'%{q}%']*3
 if author:cond.append('CAST(authors AS CHAR) LIKE %s'); vals.append(f'%{author}%')
 if source:cond.append('CAST(sources AS CHAR) LIKE %s'); vals.append(f'%{source}%')
 if year_from:cond.append('publication_year >= %s'); vals.append(year_from)
 if year_to:cond.append('publication_year <= %s'); vals.append(year_to)
 if paper_type:cond.append('paper_type=%s'); vals.append(paper_type)
 where=' WHERE '+' AND '.join(cond) if cond else ''
 order={'newest':'publication_year DESC,id DESC','oldest':'publication_year ASC,id ASC','most_cited':'citation_count DESC,id DESC'}.get(sort,'publication_year DESC,id DESC')
 cur.execute('SELECT COUNT(*) n FROM papers'+where,vals); total=cur.fetchone()['n']
 cur.execute('SELECT id,canonical_id,title,abstract,doi,authors,keywords,journal,publisher,publication_date,publication_year,paper_type,citation_count,sources,paper_url,pdf_url FROM papers'+where+f' ORDER BY {order} LIMIT %s OFFSET %s',vals+[limit,(page-1)*limit]); rows=[maprow(x) for x in cur.fetchall()]; cur.close(); c.close(); return rows,total

def get_paper_by_id(pid):
 c=get_connection(); cur=c.cursor(dictionary=True); cur.execute('SELECT * FROM papers WHERE id=%s',(pid,)); row=cur.fetchone(); cur.close(); c.close(); return maprow(row) if row else None

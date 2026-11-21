from flask import Blueprint,request,jsonify,session
from app.models.paper import search_papers,get_paper_by_id
from database.db_connection import get_connection
import os,json
from app.groq_utils import groq_chat
papers_bp=Blueprint('papers',__name__,url_prefix='/api')
def require_user():return session.get('user_id')
@papers_bp.get('/papers/filters')
def paper_filters():
 try:
  c=get_connection(); cur=c.cursor()
  cur.execute('SELECT DISTINCT paper_type FROM papers WHERE paper_type IS NOT NULL AND paper_type<>'' ORDER BY paper_type')
  types=[r[0] for r in cur.fetchall()]
  cur.execute('SELECT MIN(publication_year),MAX(publication_year) FROM papers WHERE publication_year IS NOT NULL')
  yr=cur.fetchone()
  cur.execute('SELECT DISTINCT sources FROM papers WHERE sources IS NOT NULL LIMIT 2000')
  source_set=set()
  for (raw,) in cur.fetchall():
   try:
    vals=json.loads(raw) if isinstance(raw,str) else raw
    if isinstance(vals,list): source_set.update(str(x) for x in vals if x)
   except Exception: pass
  return jsonify(success=True,data={'sources':sorted(source_set),'paper_types':types,'year_range':{'min':yr[0] if yr else None,'max':yr[1] if yr else None}})
 finally:
  try: cur.close(); c.close()
  except Exception: pass

@papers_bp.get('/papers')
def list_papers():
 try:
  page=max(1,int(request.args.get('page',1))); limit=min(100,max(1,int(request.args.get('limit',20))))
  rows,total=search_papers(q=request.args.get('q') or None,author=request.args.get('author') or None,source=request.args.get('source') or None,year_from=request.args.get('year_from'),year_to=request.args.get('year_to'),paper_type=request.args.get('paper_type') or None,sort=request.args.get('sort','newest'),page=page,limit=limit)
  return jsonify(success=True,data=rows,pagination={'page':page,'limit':limit,'total':total,'total_pages':(total+limit-1)//limit})
 except Exception as e:return jsonify(success=False,error=str(e)),503
@papers_bp.get('/papers/<int:pid>')
def paper(pid):
 try:
  p=get_paper_by_id(pid); return (jsonify(success=True,data=p),200) if p else (jsonify(error='Paper not found'),404)
 except Exception as e:return jsonify(error=str(e)),503
@papers_bp.route('/saved',methods=['GET','POST','DELETE'])
def saved():
 uid=require_user()
 if not uid:return jsonify(error='Please log in to use your research library.'),401
 d=request.get_json(silent=True) or {}; c=get_connection(); cur=c.cursor(dictionary=True)
 try:
  if request.method=='POST':
   pid=int(d.get('paper_id')); cur.execute('INSERT IGNORE INTO saved_papers(user_id,paper_id) VALUES(%s,%s)',(uid,pid)); c.commit(); return jsonify(success=True)
  if request.method=='DELETE':
   cur.execute('DELETE FROM saved_papers WHERE user_id=%s AND paper_id=%s',(uid,int(d.get('paper_id')))); c.commit(); return jsonify(success=True)
  cur.execute('SELECT p.* FROM saved_papers s JOIN papers p ON p.id=s.paper_id WHERE s.user_id=%s ORDER BY s.created_at DESC',(uid,)); from app.models.paper import maprow
  return jsonify(success=True,data=[maprow(x) for x in cur.fetchall()])
 finally:cur.close(); c.close()
@papers_bp.get('/recommendations')
def recommendations():
 if not require_user():return jsonify(error='Please log in first.'),401
 topic=(request.args.get('topic') or '').strip()
 if not topic:return jsonify(success=True,data=[])
 try:
  rows,_=search_papers(q=topic,sort='most_cited',page=1,limit=20)
  if not rows:return jsonify(success=True,data=[],method='No matching indexed papers')
  key=os.getenv('GROQ_API_KEY')
  if not key:return jsonify(error='Configure GROQ_API_KEY in backend/.env to enable AI recommendations.'),503
  candidates=[{'id':p['id'],'title':p['title'],'abstract':(p.get('abstract') or '')[:900],'year':p.get('publication_year')} for p in rows]
  prompt='You are preparing an expert academic literature recommendation report. Rank only the supplied MySQL paper records; never invent a paper, author, result, metric, or claim. For each selected paper provide: id; relevance_score (0-100); reason (a detailed 3-5 sentence explanation grounded in its title and abstract); topic_alignment; methodology_or_focus (only when supported); useful_for (specific literature-review or project use); limitations_or_missing_information (say not clear from abstract when needed); and suggested_reading_priority (High/Medium/Low). Also provide a 2-4 sentence synthesis describing common themes across the selected papers and 2-3 research directions that appear worth investigating, clearly label these as suggestions rather than proven gaps. Return valid JSON exactly with keys ranked, synthesis, research_directions. Topic: '+topic+'\nCandidates: '+json.dumps(candidates,ensure_ascii=False)
  response=groq_chat({'temperature':0.1,'response_format':{'type':'json_object'},'messages':[{'role':'system','content':'You are a senior academic research mentor. Be analytical, specific, useful and evidence-grounded. Never infer details absent from abstracts. Select and rank only IDs in the supplied candidates.'},{'role':'user','content':prompt}]},timeout=60)
  recommendation_report=json.loads(response['choices'][0]['message']['content']); ranked=recommendation_report.get('ranked',[])
  by_id={p['id']:p for p in rows}; result=[]
  for item in ranked:
   p=by_id.get(int(item.get('id',-1)))
   if p and p not in result:p['recommendation_reason']=str(item.get('reason','')); p['relevance_score']=item.get('relevance_score'); p['topic_alignment']=str(item.get('topic_alignment','')); p['methodology_or_focus']=str(item.get('methodology_or_focus','')); p['useful_for']=str(item.get('useful_for','')); p['recommendation_limitations']=str(item.get('limitations_or_missing_information','')); p['reading_priority']=str(item.get('suggested_reading_priority','')); result.append(p)
  for p in rows:
   if p not in result: p['recommendation_reason']='Additional database match; review its abstract for fit.'; result.append(p)
  return jsonify(success=True,data=result[:15],synthesis=recommendation_report.get('synthesis',''),research_directions=recommendation_report.get('research_directions',[]),method='Detailed Groq academic evaluation grounded in retrieved MySQL papers')
 except Exception as e:return jsonify(error=str(e)),503

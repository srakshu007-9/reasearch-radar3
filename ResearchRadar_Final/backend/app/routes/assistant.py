from app.groq_utils import groq_chat
from flask import Blueprint,request,jsonify,session
from app.models.paper import search_papers
from database.db_connection import get_connection
assistant_bp=Blueprint('assistant',__name__,url_prefix='/api/assistant')
def groq(messages):
 result=groq_chat({'messages':messages,'temperature':0.2},timeout=90)
 return result['choices'][0]['message']['content']
@assistant_bp.post('/chat')
def chat():
 uid=session.get('user_id'); d=request.get_json(silent=True) or {}; q=(d.get('message') or '').strip()
 if not q:return jsonify(error='Enter a question.'),400
 try:
  papers,_=search_papers(q=q,limit=6); ctx='\n\n'.join(f"Title: {p['title']}\nAbstract: {p.get('abstract') or 'Not supplied'}\nDOI: {p.get('doi') or 'Not supplied'}" for p in papers)
  answer=groq([{'role':'system','content':'You are ResearchRadar, a careful academic research assistant. Distinguish retrieved paper facts from general explanation. Never invent papers, citations, methods or numerical findings. Say when the database has no relevant record.'},{'role':'user','content':f'Database context:\n{ctx or "No matching papers were found in the database."}\n\nQuestion: {q}'}])
  if uid:
   c=get_connection(); cur=c.cursor(); cur.execute("INSERT INTO chat_history(user_id,role,message) VALUES(%s,'user',%s),(%s,'assistant',%s)",(uid,q,uid,answer)); c.commit(); cur.close(); c.close()
  return jsonify(success=True,answer=answer,papers_used=len(papers))
 except Exception as e:return jsonify(error=str(e)),503
@assistant_bp.get('/history')
def history():
 uid=session.get('user_id')
 if not uid:return jsonify(error='Please log in.'),401
 c=get_connection(); cur=c.cursor(dictionary=True); cur.execute('SELECT role,message,created_at FROM chat_history WHERE user_id=%s ORDER BY id DESC LIMIT 50',(uid,)); rows=cur.fetchall(); cur.close(); c.close(); return jsonify(success=True,data=list(reversed(rows)))

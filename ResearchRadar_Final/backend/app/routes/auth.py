import re
from flask import Blueprint,request,jsonify,session
from werkzeug.security import generate_password_hash,check_password_hash
from database.db_connection import get_connection
auth_bp=Blueprint('auth',__name__,url_prefix='/api/auth')
@auth_bp.post('/signup')
def signup():
 d=request.get_json(silent=True) or {}; name=(d.get('name') or '').strip(); email=(d.get('email') or '').strip().lower(); pw=d.get('password') or ''
 if not name or not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',email) or len(pw)<8:return jsonify(error='Enter a name, valid email and password of at least 8 characters.'),400
 try:
  c=get_connection(); cur=c.cursor(); cur.execute('INSERT INTO users(name,email,password_hash) VALUES(%s,%s,%s)',(name,email,generate_password_hash(pw))); c.commit(); uid=cur.lastrowid; cur.close(); c.close()
  session.clear(); session['user_id']=uid; session['user_name']=name; return jsonify(success=True,user={'id':uid,'name':name,'email':email}),201
 except Exception as e:
  message = str(e).lower()
  if 'duplicate' in message or '1062' in message:
   return jsonify(error='This email is already registered. Please log in instead.'),409
  return jsonify(error='Database unavailable. Check MySQL is running and backend/.env is correct.'),503
@auth_bp.post('/login')
def login():
 d=request.get_json(silent=True) or {}; email=(d.get('email') or '').strip().lower(); pw=d.get('password') or ''
 try:
  c=get_connection(); cur=c.cursor(dictionary=True); cur.execute('SELECT id,name,email,password_hash FROM users WHERE email=%s',(email,)); u=cur.fetchone(); cur.close(); c.close()
 except Exception:return jsonify(error='Database unavailable. Check backend/.env and MySQL.'),503
 if not u or not check_password_hash(u['password_hash'],pw):return jsonify(error='Invalid email or password.'),401
 session.clear(); session['user_id']=u['id']; session['user_name']=u['name']; u.pop('password_hash'); return jsonify(success=True,user=u)
@auth_bp.get('/me')
def me():
 if not session.get('user_id'):return jsonify(user=None),401
 
 try:
  c=get_connection(); cur=c.cursor(dictionary=True); cur.execute('SELECT id,name,email FROM users WHERE id=%s',(session['user_id'],)); u=cur.fetchone(); cur.close(); c.close(); return jsonify(user=u)
 except Exception:return jsonify(user={'id':session['user_id'],'name':session.get('user_name')})
@auth_bp.post('/logout')
def logout(): session.clear(); return jsonify(success=True)

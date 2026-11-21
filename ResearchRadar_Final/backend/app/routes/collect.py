from pathlib import Path
from flask import Blueprint,jsonify,session
collect_bp=Blueprint('collect',__name__,url_prefix='/api/collection')
@collect_bp.get('/status')
def status():
 from pathlib import Path
 import json
 p=Path(__file__).resolve().parents[2]/'data'/'last_collection.json'
 if not p.exists():return jsonify(success=True,data=None,message='No collection run has been recorded yet.')
 try:return jsonify(success=True,data=json.loads(p.read_text(encoding='utf-8')))
 except:return jsonify(success=False,error='Collection status file could not be read.'),500

@collect_bp.post('/run')
def run_collection():
    if not session.get('user_id'): return jsonify(error='Please log in before starting collection.'),401
    import subprocess,sys,os
    script=Path(__file__).resolve().parents[2]/'collect_and_import.py'
    try:
        result=subprocess.run([sys.executable,str(script)],cwd=str(script.parent),capture_output=True,text=True,timeout=600)
        if result.returncode: return jsonify(success=False,error=(result.stderr or result.stdout)[-5000:]),500
        return jsonify(success=True,output=result.stdout[-5000:])
    except subprocess.TimeoutExpired: return jsonify(success=False,error='Collection exceeded 10 minutes. Check backend/data/last_collection.json and run the CLI for longer jobs.'),504

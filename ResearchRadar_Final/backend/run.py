import os,sys
from pathlib import Path
from dotenv import load_dotenv
BASE=Path(__file__).resolve().parent; load_dotenv(BASE/'.env'); sys.path.insert(0,str(BASE))
from app import create_app
app=create_app()
if __name__=='__main__':
 debug=os.getenv('FLASK_DEBUG','false').lower() in ('1','true','yes')
 print('ResearchRadar API: http://127.0.0.1:5000'); app.run(host='127.0.0.1',port=5000,debug=debug)

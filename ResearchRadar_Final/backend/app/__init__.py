import os
from flask import Flask
from flask_cors import CORS

def create_app():
    app=Flask(__name__)
    app.secret_key=os.getenv('SECRET_KEY','change-this-secret-before-deployment')
    app.config.update(SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',SESSION_COOKIE_SECURE=os.getenv('SESSION_COOKIE_SECURE','false').lower() in ('1','true','yes'),MAX_CONTENT_LENGTH=2 * 1024 * 1024)
    CORS(app, supports_credentials=True, origins=os.getenv('FRONTEND_ORIGIN','http://localhost:5173').split(','))
    from app.routes.auth import auth_bp
    from app.routes.papers import papers_bp
    from app.routes.assistant import assistant_bp
    from app.routes.reader import reader_bp
    from app.routes.collect import collect_bp
    from app.routes.helpdesk import helpdesk_bp
    for bp in (auth_bp,papers_bp,assistant_bp,reader_bp,collect_bp,helpdesk_bp): app.register_blueprint(bp)
    @app.get('/api/health')
    def health():
        from database.db_connection import get_connection
        try:
            c=get_connection(); c.close(); db=True
        except Exception: db=False
        return {'success':True,'database':db,'groq_configured':bool(os.getenv('GROQ_API_KEY') and os.getenv('GROQ_API_KEY') != 'YOUR_GROQ_KEY'), 'database_name':os.getenv('DB_NAME','researchhub')}
    return app

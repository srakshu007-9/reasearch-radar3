import os
from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all origins and routes so frontend can connect from localhost, 127.0.0.1, or network IP
    CORS(app, resources={r"/*": {"origins": "*"}})

    from app.routes.papers import papers_bp
    app.register_blueprint(papers_bp)

    return app

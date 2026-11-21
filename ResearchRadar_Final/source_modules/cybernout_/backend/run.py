import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app

app = create_app()

if __name__ == '__main__':
    debug_mode = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1")
    print(f"Starting ResearchHub Flask API on http://127.0.0.1:5000 (debug={debug_mode})")
    app.run(host='0.0.0.0', port=5000, debug=debug_mode, use_reloader=debug_mode)

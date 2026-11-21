"""Shared Groq API helper with retired-model migration and readable errors."""
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env even when the Flask app is imported outside run.py.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
RETIRED_MODELS = {
    "llama-3.3-70b-versatile": DEFAULT_GROQ_MODEL,
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
}

def active_groq_model():
    requested = (os.getenv("GROQ_MODEL") or DEFAULT_GROQ_MODEL).strip()
    return RETIRED_MODELS.get(requested, requested)

def groq_chat(payload, timeout=90):
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key or api_key == "YOUR_GROQ_KEY":
        raise RuntimeError("GROQ_API_KEY is missing. Add your valid Groq API key to backend/.env.")
    body = dict(payload)
    body["model"] = active_groq_model()
    try:
        response = requests.post(
            GROQ_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=body,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Could not reach Groq API: {exc}") from exc
    if not response.ok:
        try:
            details = response.json().get("error", {}).get("message") or response.text
        except (ValueError, AttributeError):
            details = response.text
        if response.status_code == 401:
            hint = "Check that GROQ_API_KEY in backend/.env is valid."
        elif response.status_code == 404:
            hint = f"Model '{body['model']}' was not found or is unavailable to this API key. Check the current model ID in Groq Console."
        elif response.status_code == 429:
            hint = "Groq rate limit or quota reached. Try again later."
        else:
            hint = "Check your Groq account, model access and API response."
        raise RuntimeError(f"Groq API error (HTTP {response.status_code}): {details}. {hint}")
    return response.json()

import os
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

load_dotenv() 
import history_store
from graph import ask_code_ninja, LANGUAGE_LABELS
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "has_api_key": bool(os.environ.get("GROQ_API_KEY"))})


@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    language = body.get("language") or "python"
    thread_id = body.get("thread_id") or str(uuid.uuid4())

    if language not in LANGUAGE_LABELS:
        language = "python"

    if not message:
        return jsonify({"error": "message is required"}), 400

    history_store.ensure_thread(thread_id, language)

    try:
        reply = ask_code_ninja(thread_id, message, language)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc: 
        return jsonify({"error": f"Code Ninja couldn't reach Gemini: {exc}"}), 502

    history_store.append_messages(thread_id, message, reply, language)
    thread = history_store.get_thread(thread_id)

    return jsonify(
        {
            "thread_id": thread_id,
            "reply": reply,
            "title": thread["title"],
        }
    )


@app.post("/api/new_chat")
def new_chat():
    thread_id = str(uuid.uuid4())
    language = (request.get_json(silent=True) or {}).get("language", "python")
    history_store.ensure_thread(thread_id, language)
    return jsonify({"thread_id": thread_id})


@app.get("/api/history")
def history():
    return jsonify({"threads": history_store.list_threads()})


@app.get("/api/history/<thread_id>")
def history_thread(thread_id):
    thread = history_store.get_thread(thread_id)
    if not thread:
        return jsonify({"error": "not found"}), 404
    return jsonify(thread)


@app.delete("/api/history/<thread_id>")
def delete_history_thread(thread_id):
    history_store.delete_thread(thread_id)
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)

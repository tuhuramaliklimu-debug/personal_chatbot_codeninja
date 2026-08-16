import json
import os
import threading
from datetime import datetime, timezone

_LOCK = threading.Lock()
_FILE = os.path.join(os.path.dirname(__file__), "chat_history.json")


def _load() -> dict:
    if not os.path.exists(_FILE):
        return {"threads": {}}
    with open(_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {"threads": {}}


def _save(data: dict) -> None:
    with open(_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def list_threads() -> list:
    with _LOCK:
        data = _load()
    threads = list(data["threads"].values())
    threads.sort(key=lambda t: t["updated_at"], reverse=True)
    return threads


def get_thread(thread_id: str) -> dict | None:
    with _LOCK:
        data = _load()
    return data["threads"].get(thread_id)


def ensure_thread(thread_id: str, language: str) -> None:
    with _LOCK:
        data = _load()
        if thread_id not in data["threads"]:
            now = datetime.now(timezone.utc).isoformat()
            data["threads"][thread_id] = {
                "id": thread_id,
                "title": "New Conversation",
                "language": language,
                "created_at": now,
                "updated_at": now,
                "messages": [],
            }
            _save(data)


def append_messages(thread_id: str, user_text: str, reply_text: str, language: str) -> None:
    with _LOCK:
        data = _load()
        thread = data["threads"].setdefault(
            thread_id,
            {
                "id": thread_id,
                "title": "New Conversation",
                "language": language,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "messages": [],
            },
        )
        if thread["title"] == "New Conversation" and user_text.strip():
            title = user_text.strip().splitlines()[0]
            thread["title"] = (title[:42] + "...") if len(title) > 42 else title
        thread["language"] = language
        thread["messages"].append({"role": "user", "content": user_text})
        thread["messages"].append({"role": "assistant", "content": reply_text})
        thread["updated_at"] = datetime.now(timezone.utc).isoformat()
        _save(data)


def delete_thread(thread_id: str) -> None:
    with _LOCK:
        data = _load()
        data["threads"].pop(thread_id, None)
        _save(data)

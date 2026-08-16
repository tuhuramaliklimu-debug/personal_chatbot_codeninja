const API_BASE = "";
const SYLLABUS = [
  { id: "binary-search", name: "Binary Search", difficulty: "Easy", desc: "Learn divide-and-conquer on sorted arrays", prompt: "Teach me binary search: the core idea, when to use it, its time complexity, and a clean code example." },
  { id: "two-pointers", name: "Two Pointers", difficulty: "Easy", desc: "Solve array pairing in linear time", prompt: "Teach me the two pointers technique with an example problem, and explain why it's faster than brute force." },
  { id: "dp", name: "Dynamic Programming", difficulty: "Hard", desc: "Master subproblems & memoization", prompt: "Teach me dynamic programming: how to recognize a DP problem, memoization vs tabulation, and a worked example." },
  { id: "sliding-window", name: "Sliding Window", difficulty: "Medium", desc: "Optimize contiguous subarrays easily", prompt: "Teach me the sliding window technique, when it applies, and walk through an example problem." },
  { id: "bfs-dfs", name: "BFS & DFS Graph Traversals", difficulty: "Medium", desc: "Learn layer-by-layer vs deep pathing", prompt: "Teach me BFS and DFS for graphs: how each works, when to pick one over the other, and code for both." },
  { id: "recursion", name: "Recursion & Backtracking", difficulty: "Medium", desc: "Break problems into smaller versions of themselves", prompt: "Teach me recursion and backtracking, with a classic backtracking example like N-Queens or subsets." },
];

const state = {
  language: localStorage.getItem("cn_language") || "python",
  theme: localStorage.getItem("cn_theme") || "dark",
  threadId: localStorage.getItem("cn_thread_id") || null,
  userName: localStorage.getItem("cn_username") || "Coder",
};

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.getElementById("theme-icon").textContent = state.theme === "dark" ? "☀️" : "🌙";
}

document.getElementById("theme-toggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("cn_theme", state.theme);
  applyTheme();
});

document.getElementById("reset-btn").addEventListener("click", async () => {
  state.theme = "dark";
  state.language = "python";
  localStorage.setItem("cn_theme", state.theme);
  localStorage.setItem("cn_language", state.language);
  applyTheme();
  setActiveLanguageButton();
  await startNewChat();
});


document.getElementById("edit-name-btn").addEventListener("click", () => {
  const name = prompt("What should Code Ninja call you?", state.userName);
  if (name && name.trim()) {
    state.userName = name.trim();
    localStorage.setItem("cn_username", state.userName);
    document.getElementById("user-name").textContent = state.userName;
  }
});



function setActiveLanguageButton() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.language);
  });
}

document.getElementById("lang-switch").addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-btn");
  if (!btn) return;
  state.language = btn.dataset.lang;
  localStorage.setItem("cn_language", state.language);
  setActiveLanguageButton();
});



document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "history") loadHistoryList();
    if (btn.dataset.tab === "revision") loadRevisionList();
  });
});



function renderSyllabus() {
  const list = document.getElementById("preset-list");
  list.innerHTML = "";
  SYLLABUS.forEach((item) => {
    const card = document.createElement("div");
    card.className = "preset-card";
    card.innerHTML = `
      <div class="preset-top">
        <span>${item.name}</span>
        <span class="diff-badge diff-${item.difficulty}">${item.difficulty}</span>
      </div>
      <div class="preset-desc">${item.desc}</div>
    `;
    card.addEventListener("click", () => {
      document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      sendMessage(item.prompt);
    });
    list.appendChild(card);
  });
  document.getElementById("preset-count").textContent = `${SYLLABUS.length} Presets Available`;
}



const notebookArea = document.getElementById("notebook-area");
notebookArea.value = localStorage.getItem("cn_notebook") || "";
notebookArea.addEventListener("input", () => {
  localStorage.setItem("cn_notebook", notebookArea.value);
});


const messagesEl = document.getElementById("messages");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


function renderContent(text) {
  const escaped = escapeHtml(text);
  const withCode = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang}">${code}</code></pre>`;
  });
  return withCode
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMessage(role, text, { animate = true } = {}) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  if (!animate) msg.style.animation = "none";
  msg.innerHTML = `
    <div class="avatar">${role === "user" ? "🧑" : `<svg class="bot-face" viewBox="0 0 40 40" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><circle class="bot-antenna-dot" cx="20" cy="4" r="2.2" fill="#d97757"/><line x1="20" y1="6" x2="20" y2="10" stroke="var(--accent)" stroke-width="1.8"/><rect x="6" y="10" width="28" height="22" rx="8" fill="var(--accent)"/><ellipse class="bot-eye" cx="15" cy="21" rx="2.6" ry="3.2" fill="var(--panel)"/><ellipse class="bot-eye" cx="25" cy="21" rx="2.6" ry="3.2" fill="var(--panel)"/><path d="M15 26.5 Q20 29.5 25 26.5" stroke="var(--panel)" stroke-width="1.6" fill="none" stroke-linecap="round"/><rect x="2" y="17" width="3" height="7" rx="1.5" fill="var(--accent)"/><rect x="35" y="17" width="3" height="7" rx="1.5" fill="var(--accent)"/></svg>`}</div>
    <div>
      <div class="bubble">${renderContent(text)}</div>
      <div class="msg-time">${timeNow()}</div>
    </div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

function addTypingIndicator() {
  const msg = document.createElement("div");
  msg.className = "msg assistant";
  msg.id = "typing-indicator";
  msg.innerHTML = `
    <div class="avatar">🥷</div>
    <div class="bubble">
      <span class="typing-dots"><span></span><span></span><span></span></span>
    </div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function showWelcome() {
  messagesEl.innerHTML = "";
  addMessage(
    "assistant",
    "Hey 👋 I'm Code Ninja. Ready to sharpen your DSA skills? Ask me anything about Data Structures or Algorithms!\n\n" +
      "💡 Tip: Pick Python, C++, or Java in the top-right header to get code examples in your preferred language!",
    { animate: false }
  );
}

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const chatTitleEl = document.getElementById("chat-title");

async function sendMessage(text) {
  if (!text.trim()) return;
  addMessage("user", text);
  chatInput.value = "";
  sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        language: state.language,
        thread_id: state.threadId,
      }),
    });
    const data = await res.json();
    removeTypingIndicator();

    if (!res.ok) {
      addMessage("assistant", `⚠️ ${data.error || "Something went wrong."}`);
      return;
    }

    state.threadId = data.thread_id;
    localStorage.setItem("cn_thread_id", state.threadId);
    chatTitleEl.textContent = data.title || "New Conversation";
    addMessage("assistant", data.reply);
  } catch (err) {
    removeTypingIndicator();
    addMessage(
      "assistant",
      "⚠️ Couldn't reach the backend. Make sure `python app.py` is running in the backend folder, then refresh this page."
    );
  } finally {
    sendBtn.disabled = false;
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(chatInput.value);
});

document.getElementById("quick-prompts").addEventListener("click", (e) => {
  const btn = e.target.closest(".quick-btn");
  if (!btn) return;
  sendMessage(btn.dataset.prompt);
});

// ---------- New chat ----------

async function startNewChat() {
  try {
    const res = await fetch(`${API_BASE}/api/new_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: state.language }),
    });
    const data = await res.json();
    state.threadId = data.thread_id;
    localStorage.setItem("cn_thread_id", state.threadId);
  } catch (err) {
    state.threadId = null;
    localStorage.removeItem("cn_thread_id");
  }
  chatTitleEl.textContent = "New Conversation";
  showWelcome();
}

document.getElementById("new-chat-btn").addEventListener("click", startNewChat);


function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

async function loadHistoryList() {
  const listEl = document.getElementById("history-list");
  listEl.innerHTML = `<p class="empty-hint">Loading...</p>`;
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();
    if (!data.threads.length) {
      listEl.innerHTML = `<p class="empty-hint">No past conversations yet. Start chatting and they'll show up here.</p>`;
      return;
    }
    listEl.innerHTML = "";
    data.threads.forEach((thread) => {
      const card = document.createElement("div");
      card.className = "history-card";
      card.innerHTML = `
        <div>
          <div class="history-title">${escapeHtml(thread.title)}</div>
          <div class="history-sub">${relativeTime(thread.updated_at)} · ${thread.language}</div>
        </div>
        <button class="history-delete" title="Delete">🗑</button>
      `;
      card.querySelector(".history-title, .history-sub")?.addEventListener?.("click", () => {});
      card.addEventListener("click", (e) => {
        if (e.target.closest(".history-delete")) return;
        openThread(thread.id);
      });
      card.querySelector(".history-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        await fetch(`${API_BASE}/api/history/${thread.id}`, { method: "DELETE" });
        loadHistoryList();
      });
      listEl.appendChild(card);
    });
  } catch (err) {
    listEl.innerHTML = `<p class="empty-hint">Couldn't load history. Is the backend running?</p>`;
  }
}

async function openThread(threadId) {
  try {
    const res = await fetch(`${API_BASE}/api/history/${threadId}`);
    if (!res.ok) return;
    const thread = await res.json();
    state.threadId = threadId;
    localStorage.setItem("cn_thread_id", threadId);
    state.language = thread.language || state.language;
    localStorage.setItem("cn_language", state.language);
    setActiveLanguageButton();
    chatTitleEl.textContent = thread.title || "Conversation";
    messagesEl.innerHTML = "";
    thread.messages.forEach((m) => addMessage(m.role === "user" ? "user" : "assistant", m.content, { animate: false }));
    if (!thread.messages.length) showWelcome();
  } catch (err) {
    /* ignore */
  }
}

function loadRevisionList() {
  const el = document.getElementById("revision-list");
  fetch(`${API_BASE}/api/history`)
    .then((r) => r.json())
    .then((data) => {
      if (!data.threads.length) {
        el.innerHTML = `<p class="empty-hint">Topics you ask about will show up here for quick revision.</p>`;
        return;
      }
      el.innerHTML = "";
      data.threads.slice(0, 12).forEach((t) => {
        const row = document.createElement("div");
        row.className = "preset-card";
        row.innerHTML = `<div class="preset-top"><span>${escapeHtml(t.title)}</span></div>
          <div class="preset-desc">Last studied ${relativeTime(t.updated_at)}</div>`;
        row.addEventListener("click", () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('.tab-btn[data-tab="syllabus"]').classList.remove('active');
          document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
          document.querySelector('.tab-btn[data-tab="history"]').classList.add('active');
          document.getElementById('tab-history').classList.add('active');
          openThread(t.id);
        });
        el.appendChild(row);
      });
    })
    .catch(() => {
      el.innerHTML = `<p class="empty-hint">Couldn't load revision topics.</p>`;
    });
}


function init() {
  applyTheme();
  setActiveLanguageButton();
  document.getElementById("user-name").textContent = state.userName;
  renderSyllabus();

  if (state.threadId) {
    openThread(state.threadId);
  } else {
    showWelcome();
  }
}

init();

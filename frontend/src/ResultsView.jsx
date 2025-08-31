import React, { useMemo, useState } from "react";
// renders the tabs (Summary/Key/ELI5/Action/Learn) and the chat mode. Chat calls /api/ask and shows a right sidebar.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

export default function ResultsView({ data }) {
  // tab = which results tab is active; mode = 'results' vs 'chat'
  const [tab, setTab] = useState("summary");
  const [mode, setMode] = useState("results"); // 'results' | 'chat'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sidebarTab, setSidebarTab] = useState(null); // null | 'summary' | 'key' | 'eli5' | 'action' | 'learn'

  const summary = data?.summary || "";
  const key_points = data?.key_points || [];
  const eli5 = data?.eli5 || "";
  const action_items = data?.action_items || [];

  // Copy the current tab's content to clipboard
  const copyCurrent = async () => {
    let text = "";
    if (tab === "summary") text = summary;
    if (tab === "key") text = key_points.map((p) => `• ${p}`).join("\n");
    if (tab === "eli5") text = eli5;
    if (tab === "action") text = action_items.map((a) => `• ${a}`).join("\n");
    try {
      await navigator.clipboard.writeText(text || "");
    } catch {}
  };

  // Build a markdown document and trigger a download
  const downloadMd = () => {
    const md = [
      "# Summary",
      summary || "",
      "",
      "## Key Points",
      ...key_points.map((p) => `- ${p}`),
      "",
      "## Explain Like I'm 5",
      "",
      eli5,
      "",
      "## Action Items",
      ...action_items.map((a) => `- ${a}`),
      "",
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chat submit: POST question to backend /api/ask and append reply
  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text) return;
    const userMsg = { role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const payload = await res.json();
      const content = payload?.answer || payload?.error || "No answer.";
      const assistantMsg = { role: "assistant", content, ts: Date.now() };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      const assistantMsg = { role: "assistant", content: "Error contacting AI.", ts: Date.now() };
      setMessages((m) => [...m, assistantMsg]);
    }
  };

  const learnTopic = useMemo(() => {
    if (key_points[0]) return String(key_points[0]).slice(0, 120);
    const firstSentence = (summary || "").split(/(?<=[.!?])\s+/)[0] || "research topic";
    return String(firstSentence).slice(0, 120);
  }, [summary, key_points]);

  const learnLinks = useMemo(() => {
    const q = encodeURIComponent(learnTopic);
    return [
      { label: "YouTube", url: `https://www.youtube.com/results?search_query=${q}` },
      { label: "Stack Overflow", url: `https://stackoverflow.com/search?q=${q}` },
      { label: "GeeksforGeeks", url: `https://www.geeksforgeeks.org/?s=${q}` },
      { label: "Wikipedia", url: `https://en.wikipedia.org/w/index.php?search=${q}` },
    ];
  }, [learnTopic]);

  // Right-side insights sidebar (shown while chatting)
  const Sidebar = () => (
    <>
      {/* Right sidebar with tabs (visible in chat mode) */}
      <div
        className="card"
        style={{
          position: "fixed",
          top: 140,
          right: 24,
          width: 220,
          padding: 12,
          zIndex: 40,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Paper Insights</div>
        <div
          className="tabs"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div
            className={`tab ${sidebarTab === "summary" ? "active" : ""}`}
            onClick={() => setSidebarTab("summary")}
          >
            📚 Summary
          </div>
          <div
            className={`tab ${sidebarTab === "key" ? "active" : ""}`}
            onClick={() => setSidebarTab("key")}
          >
            🔑 Key Points
          </div>
          <div
            className={`tab ${sidebarTab === "eli5" ? "active" : ""}`}
            onClick={() => setSidebarTab("eli5")}
          >
            👶 ELI5
          </div>
          <div
            className={`tab ${sidebarTab === "action" ? "active" : ""}`}
            onClick={() => setSidebarTab("action")}
          >
            📌 Action Items
          </div>
          <div
            className={`tab ${sidebarTab === "learn" ? "active" : ""}`}
            onClick={() => setSidebarTab("learn")}
          >
            🧠 Learn More
          </div>
        </div>
      </div>

      {sidebarTab && (
        <div
          className="card"
          style={{
            position: "fixed",
            top: 140,
            right: 284,
            width: 360,
            padding: 16,
            zIndex: 41,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
              {sidebarTab === "summary" && "📚 Summary"}
              {sidebarTab === "key" && "🔑 Key Points"}
              {sidebarTab === "eli5" && "👶 Explain Like I'm 5"}
              {sidebarTab === "action" && "📌 Action Items"}
              {sidebarTab === "learn" && "🧠 Learn More"}
            </div>
            <button
              className="button"
              onClick={() => setSidebarTab(null)}
              style={{ padding: "6px 10px" }}
            >
              Close
            </button>
          </div>
          {sidebarTab === "summary" && (
            <div style={{ whiteSpace: "pre-wrap" }}>{summary}</div>
          )}
          {sidebarTab === "key" && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {key_points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
          {sidebarTab === "eli5" && (
            <div style={{ whiteSpace: "pre-wrap" }}>{eli5}</div>
          )}
          {sidebarTab === "action" && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {action_items.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
          {sidebarTab === "learn" && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {learnLinks.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    {l.label}: {learnTopic}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {mode === "results" && (
        <div className="card results">
          <div className="tabs">
            <div
              className={`tab ${tab === "summary" ? "active" : ""}`}
              onClick={() => setTab("summary")}
            >
              📚 Summary
            </div>
            <div
              className={`tab ${tab === "key" ? "active" : ""}`}
              onClick={() => setTab("key")}
            >
              🔑 Key Points
            </div>
            <div
              className={`tab ${tab === "eli5" ? "active" : ""}`}
              onClick={() => setTab("eli5")}
            >
              👶 ELI5
            </div>
            <div
              className={`tab ${tab === "action" ? "active" : ""}`}
              onClick={() => setTab("action")}
            >
              📌 Action Items
            </div>
            <div
              className={`tab ${tab === "learn" ? "active" : ""}`}
              onClick={() => setTab("learn")}
            >
              🧠 Learn More
            </div>
            <div style={{ flex: 1 }} />
            <button className="button" onClick={copyCurrent}>
              Copy
            </button>
            <button className="button" onClick={downloadMd}>
              Download
            </button>
          </div>

          {tab === "summary" && (
            <section>
              <h3>📚 Summary</h3>
              <p>{summary}</p>
            </section>
          )}
          {tab === "key" && (
            <section>
              <h3>🔑 Key Points</h3>
              <ul>
                {key_points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          )}
          {tab === "eli5" && (
            <section>
              <h3>👶 Explain Like I'm 5</h3>
              <p>{eli5}</p>
            </section>
          )}
          {tab === "action" && (
            <section>
              <h3>📌 Action Items</h3>
              <ul>
                {action_items.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}
          {tab === "learn" && (
            <section>
              <h3>🧠 Learn More</h3>
              <ul>
                {learnLinks.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label}: {learnTopic}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="button" onClick={() => setMode("chat")}>
              💬 Ask about the paper
            </button>
          </div>
        </div>
      )}

      {mode === "chat" && (
        <>
          <div className="card results" style={{ paddingBottom: 16 }}>
            <div className="tabs" style={{ alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Conversation</div>
              <div style={{ flex: 1 }} />
              <button className="button" onClick={() => setMode("results")}>
                Back to Results
              </button>
            </div>

            <div
              className="chat-container"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div
                className="messages"
                style={{
                  border: "1px solid rgba(31,41,55,.65)",
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 220,
                  maxHeight: 360,
                  overflowY: "auto",
                  background: "rgba(2,6,23,.25)",
                }}
              >
                {messages.length === 0 && (
                  <div style={{ color: "#94a3b8" }}>
                    Ask a question about the paper to begin.
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "8px 12px",
                        borderRadius: 12,
                        background:
                          m.role === "user"
                            ? "rgba(59,130,246,.25)"
                            : "rgba(17,24,39,.6)",
                        border: "1px solid rgba(31,41,55,.65)",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleSend}
                className="chat-input-row"
                style={{ display: "flex", gap: 8 }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question about the paper..."
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(31,41,55,.65)",
                  }}
                />
                <button className="button" type="submit">
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar and popover */}
          <Sidebar />
        </>
      )}
    </>
  );
}


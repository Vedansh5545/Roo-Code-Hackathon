import React, { useRef, useState, useEffect } from "react";
import ResultsView from "./ResultsView";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    console.log("✅ LIVE App.jsx from", window.location.href, "at", new Date().toISOString());
    document.title = "AI Research Summarizer • LIVE";
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("Select a .pdf or .txt file first.");
    const fd = new FormData(); fd.append("file", file);
    setLoading(true); setResults(null);
    try {
      const res = await fetch(`${API_BASE}/api/summarize`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Error: Could not summarize document.");
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <style>{`
        :root { --bg:#0b1020; --card:rgba(15,23,42,.55); --ink:#e5e7eb; --muted:#94a3b8; --accent:#3b82f6; --border:rgba(31,41,55,.65); --radius:16px; }

        /* —— hard reset so body/#root can't be flex from anywhere —— */
        *{box-sizing:border-box}
        html,body,#root{height:100%; width:100%}
        body{ margin:0; display:block !important; }
        #root{ display:block !important; width:100% !important; }

        body{
          font-family:'Inter', system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
          background: radial-gradient(1200px 700px at 20% -20%, #0d1330 0%, #0b1020 60%) fixed;
          color:var(--ink);
          -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
        }

        /* ---- HORIZONTAL CENTER ONLY ---- */
        .page{
          width:100%;                    /* ensures centering space exists */
          padding:96px 20px 48px;        /* start a bit down from the top */
          position:relative;
          z-index:1;                     /* above aurora */
          display:flex;                  /* center children horizontally */
          justify-content:center;        /* <- horizontal centering */
        }
        .content{
          width:min(960px, 100%);
          margin:0 auto;                 /* secondary safety net */
        }

        /* hero (stacked) centered horizontally */
        .hero{
          display:flex;
          flex-direction:column;
          align-items:center;            /* horizontal center */
          justify-content:flex-start;    /* no vertical centering */
          gap:18px; margin:0 0 20px; text-align:center;
        }

        .title{margin:0; font-weight:800; letter-spacing:-.02em; font-size: clamp(36px, 6vw, 56px);}
        .badge{display:inline-block;margin-top:6px;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid var(--border);
               background:linear-gradient(180deg, rgba(17,24,39,.65), rgba(17,24,39,.35)); color:var(--muted);}
        .subtitle{color:var(--muted); margin-top:6px}
        .beam{margin:14px auto 0; height:2px; width:220px; background:#0f172a; border-radius:999px; overflow:hidden; position:relative; border:1px solid var(--border)}
        .beam::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
                     background:linear-gradient(90deg,transparent, rgba(59,130,246,.95), transparent);
                     animation:sweep 1.8s ease-in-out infinite}
        @keyframes sweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

        /* cards / buttons */
        .card{background: var(--card); border:1px solid var(--border); border-radius: var(--radius);
              backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 8px 30px rgba(0,0,0,.25);}
        .uploader{margin:18px 0; display:flex; gap:12px; align-items:center; flex-wrap:wrap; justify-content:center;}
        .button{background: var(--accent); color:#fff; border:none; border-radius:12px; padding:10px 16px; cursor:pointer; font-weight:600;
                transition: transform .12s ease, box-shadow .2s ease; box-shadow: 0 8px 18px rgba(59,130,246,.2);}
        .button:hover{ transform: translateY(-1px); box-shadow: 0 10px 22px rgba(59,130,246,.28); }
        .tip{ max-width:760px; margin:10px auto 0; padding:18px; border:1.5px dashed var(--border); background: rgba(2,6,23,.35); }

        .loadingbar{position:relative;height:3px;background:#0f172a;border-radius:999px;overflow:hidden;margin:12px auto;border:1px solid var(--border); width:min(640px, 100%)}
        .loadingbar::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
          background:linear-gradient(90deg,transparent, rgba(59,130,246,.9), transparent);animation:sweep 1.2s ease-in-out infinite}

        .results{margin-top:18px; padding:18px; max-width:860px; margin-left:auto; margin-right:auto;}
        .tabs{display:flex;gap:8px;margin-bottom:12px;align-items:center; justify-content:center;}
        .tab{padding:8px 12px; border-radius:999px; border:1px solid var(--border); background: rgba(15,23,42,.6); color:var(--muted); cursor:pointer; user-select:none}
        .tab.active{color:#fff;background:#111b33;border-color:#23324e}
        kbd{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:1px 6px;border:1px solid var(--border);border-bottom-width:2px;border-radius:6px;background:#0e162c;color:#cbd5e1}

        /* aurora background */
        .aurora{position:fixed; inset:0; z-index:0; pointer-events:none; filter:blur(96px); opacity:.9; mix-blend-mode:screen}
        .aurora > div{position:absolute; width: 60vw; height: 60vw; border-radius:50%; animation:float 32s linear infinite;}
        .a1{top:-8%; left:-12%; background:radial-gradient(closest-side, rgba(59,130,246,.55), transparent 70%); animation-duration:28s;}
        .a2{top:10%; right:-10%; background:radial-gradient(closest-side, rgba(34,211,238,.48), transparent 70%); animation-duration:34s;}
        .a3{bottom:-12%; left:22%; background:radial-gradient(closest-side, rgba(147,51,234,.42), transparent 70%); animation-duration:38s;}
        @keyframes float{0%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-6%) rotate(180deg)} 100%{transform:translateY(0) rotate(360deg)}}

        /* orb accent */
        .orb{position:relative;width:96px;height:96px;filter:drop-shadow(0 0 24px rgba(59,130,246,.45));display:inline-block;}
        .orb-core{position:absolute;inset:16px;border-radius:999px;background:
          radial-gradient(35% 35% at 35% 35%, rgba(255,255,255,.95), rgba(255,255,255,.25) 60%, transparent 61%),
          radial-gradient(circle at 65% 65%, rgba(34,211,238,.5), transparent 55%),
          radial-gradient(circle at 50% 50%, rgba(59,130,246,.85), rgba(59,130,246,.15) 55%, transparent 56%);
          box-shadow:0 0 42px rgba(59,130,246,.35), inset 0 0 26px rgba(96,165,250,.45);
          animation:orbPulse 3.2s ease-in-out infinite}
        .ring{position:absolute;inset:4px;border-radius:999px;border:2px dashed rgba(96,165,250,.65);animation:spin 14s linear infinite}
        .r2{inset:0;transform:scale(1.18);border-color:rgba(34,211,238,.6);animation-duration:22s}
        .r3{inset:-6px;transform:scale(1.34);border-color:rgba(59,130,246,.55);animation-duration:30s;filter:blur(.2px)}
        .sat{position:absolute;inset:0}
        .sat span{position:absolute;top:50%;left:50%;width:9px;height:9px;border-radius:999px;background:#fff;
                  box-shadow:0 0 12px rgba(255,255,255,.95),0 0 26px rgba(59,130,246,1);transform:translate(-50%,-50%) translateX(44px)}
        .s1{animation:spin 7.5s linear infinite}
        .s2{animation:spin 11s linear infinite reverse}
        .s2 span{transform:translate(-50%,-50%) translateX(28px);background:#22d3ee}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes orbPulse{0%,100%{box-shadow:0 0 42px rgba(59,130,246,.35), inset 0 0 26px rgba(96,165,250,.45)}
          50%{box-shadow:0 0 54px rgba(59,130,246,.5), inset 0 0 32px rgba(96,165,250,.6)}}
      `}</style>

      {/* aurora background */}
      <div className="aurora"><div className="a1" /><div className="a2" /><div className="a3" /></div>

      <div className="content">
        {/* HERO */}
        <header className="hero">
          <div className="orb" aria-hidden="true">
            <div className="orb-core" />
            <div className="ring r1" />
            <div className="ring r2" />
            <div className="ring r3" />
            <div className="sat s1"><span /></div>
            <div className="sat s2"><span /></div>
          </div>
          <div>
            <h1 className="title">AI Research Summarizer</h1>
            <div className="badge">Powered by Gemini</div>
            <div className="subtitle">
              Drop a PDF/TXT and get <kbd>Summary</kbd>, <kbd>Key Points</kbd>, <kbd>ELI5</kbd>, and <kbd>Action Items</kbd>.
            </div>
            <div className="beam" />
          </div>
        </header>

        {loading && <div className="loadingbar" aria-label="Loading" />}

        {/* UPLOAD */}
        <form onSubmit={submit} className="uploader">
          <input ref={fileRef} type="file" accept=".pdf,.txt" />
          <button className="button" type="submit">Upload & Summarize</button>
        </form>

        <div className="card tip">
          <strong>Tip:</strong> You can also drag & drop into the file picker above.
        </div>

        {/* RESULTS */}
        {results && <ResultsView data={results} />}
      </div>
    </div>
  );
}

function ResultsTabs({ data }) {
  const [tab, setTab] = useState("key");
  const key_points = data?.key_points || [];
  const eli5 = data?.eli5 || "";
  const action_items = data?.action_items || [];
  const summary = data?.summary || "";

  const copyCurrent = async () => {
    let text = "";
    if (tab === "key") text = key_points.map(p=>`• ${p}`).join("\n");
    if (tab === "eli5") text = eli5;
    if (tab === "action") text = action_items.map(a=>`• ${a}`).join("\n");
    try { await navigator.clipboard.writeText(text || ""); } catch {}
  };

  const downloadMd = () => {
    const md = ["# Summary","## Key Points",...key_points.map(p=>`- ${p}`),"","## Explain Like I'm 5","",eli5,"","## Action Items",...action_items.map(a=>`- ${a}`),""].join("\n");
    const blob = new Blob([md], {type:"text/markdown"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "summary.md"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="card results">
      <div className="tabs">
        <div className={`tab ${tab==='key'?'active':''}`} onClick={()=>setTab('key')}>🔑 Key Points</div>
        <div className={`tab ${tab==='eli5'?'active':''}`} onClick={()=>setTab('eli5')}>👶 ELI5</div>
        <div className={`tab ${tab==='action'?'active':''}`} onClick={()=>setTab('action')}>📌 Action Items</div>
        <div style={{flex:1}} />
        <button className="button" onClick={copyCurrent}>Copy</button>
        <button className="button" onClick={downloadMd}>Download .md</button>
      </div>

      {tab==='key' && (<section><h3>🔑 Key Points</h3><ul>{key_points.map((p,i)=><li key={i}>{p}</li>)}</ul></section>)}
      {tab==='eli5' && (<section><h3>👶 Explain Like I'm 5</h3><p>{eli5}</p></section>)}
      {tab==='action' && (<section><h3>📌 Action Items</h3><ul>{action_items.map((a,i)=><li key={i}>{a}</li>)}</ul></section>)}
    </div>
  );
}

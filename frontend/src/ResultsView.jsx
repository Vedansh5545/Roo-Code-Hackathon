import React, { useState } from "react";

export default function ResultsView({ data }) {
  const [tab, setTab] = useState("summary");
  const summary = data?.summary || "";
  const key_points = data?.key_points || [];
  const eli5 = data?.eli5 || "";
  const action_items = data?.action_items || [];

  const copyCurrent = async () => {
    let text = "";
    if (tab === "summary") text = summary;
    if (tab === "key") text = key_points.map(p=>`• ${p}`).join("\n");
    if (tab === "eli5") text = eli5;
    if (tab === "action") text = action_items.map(a=>`• ${a}`).join("\n");
    try { await navigator.clipboard.writeText(text || ""); } catch {}
  };

  const downloadMd = () => {
    const md = [
      "# Summary",
      summary || "",
      "",
      "## Key Points",
      ...key_points.map(p=>`- ${p}`),
      "",
      "## Explain Like I'm 5",
      "",
      eli5,
      "",
      "## Action Items",
      ...action_items.map(a=>`- ${a}`),
      "",
    ].join("\n");
    const blob = new Blob([md], {type:"text/markdown"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "summary.md"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="card results">
      <div className="tabs">
        <div className={`tab ${tab==='summary'?'active':''}`} onClick={()=>setTab('summary')}>📖 Summary</div>
        <div className={`tab ${tab==='key'?'active':''}`} onClick={()=>setTab('key')}>📝 Key Points</div>
        <div className={`tab ${tab==='eli5'?'active':''}`} onClick={()=>setTab('eli5')}>👶 ELI5</div>
        <div className={`tab ${tab==='action'?'active':''}`} onClick={()=>setTab('action')}>✅ Action Items</div>
        <div style={{flex:1}} />
        <button className="button" onClick={copyCurrent}>Copy</button>
        <button className="button" onClick={downloadMd}>Download .md</button>
      </div>

      {tab==='summary' && (<section><h3>📖 Summary</h3><p>{summary}</p></section>)}
      {tab==='key' && (<section><h3>Key Points</h3><ul>{key_points.map((p,i)=><li key={i}>{p}</li>)}</ul></section>)}
      {tab==='eli5' && (<section><h3>Explain Like I'm 5</h3><p>{eli5}</p></section>)}
      {tab==='action' && (<section><h3>Action Items</h3><ul>{action_items.map((a,i)=><li key={i}>{a}</li>)}</ul></section>)}
    </div>
  );
}


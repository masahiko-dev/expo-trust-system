"use client";

import { useState } from "react";

export default function GeneratePage() {

  const [industry, setIndustry] = useState("");
  const [expo, setExpo] = useState("");
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState("");

  async function generate() {

    const res = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        industry,
        expo,
        problem
      })
    });

    const data = await res.json();
    setResult(data.text);
  }

  return (
    <div style={{ padding: 40 }}>

      <h1>フォロー文章生成</h1>

      <input
        placeholder="業種"
        value={industry}
        onChange={(e) => setIndustry(e.target.value)}
      />

      <br/><br/>

      <input
        placeholder="展示会"
        value={expo}
        onChange={(e) => setExpo(e.target.value)}
      />

      <br/><br/>

      <input
        placeholder="よく聞いた課題"
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
      />

      <br/><br/>

      <button onClick={generate}>
        生成
      </button>

      <pre>{result}</pre>

    </div>
  );
}
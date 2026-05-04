"use client"

import { useState, useEffect } from "react"

export default function ImportPage() {

  const [file,setFile] = useState<File | null>(null)
  const [loadingImport, setLoadingImport] = useState(false)
  const [message, setMessage] = useState("")

  const [plan, setPlan] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch("/api/account/usage")
        const data = await res.json()
        setPlan(data.plan)
      } catch (e) {
        console.error("plan取得失敗")
      }
    }

    fetchPlan()
  }, [])

  const handleUpload = async () => {

    if(!file){
      alert("CSVを選択してください")
      return
    }

    setLoadingImport(true)

    try {
      const formData = new FormData()
      formData.append("file",file)


      
      const res = await fetch("/api/import-csv",{
        method:"POST",
        body:formData
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "インポート失敗")
        setLoadingImport(false)
        return
      }

      // 成功時
      setError("")
      setMessage(`${data.count}件のリードを登録しました`)
      setLoadingImport(false)

    } catch (e) {
      setError("通信エラー")
      setLoadingImport(false)
    }

  }

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>

    <h1
      style={{
        fontSize: 28,
        fontWeight: 800,
        marginBottom: 4
      }}
    >
      CSVインポート
    </h1>

    {plan === "trial" && (
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        まずは3件だけ登録して試してください
      </p>
    )}

    {plan === "poc" && (
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        最大100件まで登録できます
      </p>
    )}

    {plan === "standard" && (
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        無制限で登録できます
      </p>
    )}

      {/* STEP1 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          ① サンプルをダウンロード
        </div>
        <a
          href="/sample.csv"
          download
          style={{
            color: "#4f46e5",
            textDecoration: "underline"
          }}
        >
          CSVサンプルをダウンロード
        </a>
      </div>

      {/* STEP2 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          ② CSVをアップロード
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "inline-block",
            padding: "10px 16px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            cursor: "pointer",
            background: "#fff"
          }}
        >
          ファイルを選択
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
        </label>

        {/* 状態表示 */}
        {!file && (
          <div style={{ marginTop: 8, color: "#9ca3af" }}>
            CSVファイルを選択してください
          </div>
        )}

        {file && (
          <div style={{ marginTop: 8, color: "#374151" }}>
            選択中: {file.name}
          </div>
        )}
      </div>

      {/* インポートボタンは別ブロック */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleUpload}
          disabled={loadingImport || !file}
          style={{
            background: loadingImport || !file ? "#9ca3af" : "#4f46e5",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: loadingImport || !file ? "not-allowed" : "pointer"
          }}
        >
          {loadingImport ? "インポート中..." : "インポート"}
        </button>
      </div>
      </div>

      {/* ❌ エラーメッセージ */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fef2f2",
            border: "1px solid #f87171",
            borderRadius: 8,
            color: "#991b1b",
            fontWeight: 600
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* RESULT */}
      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#ecfdf5",
            border: "1px solid #34d399",
            borderRadius: 8,
            color: "#065f46",
            fontWeight: 600
          }}
        >
          {message}

          <div style={{ marginTop: 8 }}>
            <a
              href="/leads"
              style={{
                color: "#4f46e5",
                textDecoration: "underline",
                fontWeight: 500
              }}
            >
              リード一覧を見る →
            </a>
          </div>
        </div>
      )}



    </div>
  )

}
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function Page() {
  const [mail, setMail] = useState("")
  const [loading, setLoading] = useState(false)

  const [leads, setLeads] = useState<any[]>([])

  // 👇🔥 ここが超重要（修正版）
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()

      console.log("ログインユーザー:", data?.user)

      if (!data?.user) return

      const res = await fetch("/api/init", {
        method: "POST", // 👈 GETじゃなくてPOST
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: data.user.email
        })
      })

      const json = await res.json()
      console.log("init結果:", json)
    }

    init()
  }, [])

  // 👇 leads取得（追加）
  // useEffect(() => {
  //   fetch("/api/leads")
  //     .then(res => res.json())
  //     .then(data => {
  //       console.log("leads:", data)
  //       setLeads(data)
  //     })
  // }, [])

    useEffect(() => {
    const load = async () => {

      const res = await fetch("/api/leads", {
        credentials: "include"
      })

      const data = await res.json()

      console.log("leads:", data)

      // 🔥 エラーなら止める
      if (!res.ok) {
        console.error("API error", data)
        setLeads([])
        return
      }

      // 🔥 配列じゃなければ止める
      if (!Array.isArray(data)) {
        console.error("not array", data)
        setLeads([])
        return
      }

      setLeads(data)
    }

    load()
  }, [])

  const handleGenerate = async (day: string) => {
    const res = await fetch("/api/generate-mail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyName: "株式会社テスト",
        conversationNote: "AIチャットボットの導入が難しいと話していた",
        day
      })
    })

    const data = await res.json()
    setMail(data.mail)
  }

  return (
    <div style={{ padding: "20px" }}>

      <button onClick={() => handleGenerate("day0")}>Day0</button>
      <button onClick={() => handleGenerate("day7")}>Day7</button>
      <button onClick={() => handleGenerate("day14")}>Day14</button>
      <button onClick={() => handleGenerate("day21")}>Day21</button>
      <button onClick={() => handleGenerate("day30")}>Day30</button>

      <pre
        style={{
          marginTop: "20px",
          whiteSpace: "pre-wrap",
          background: "#f5f5f5",
          padding: "15px",
          borderRadius: "8px"
        }}
      >
        {mail}
      </pre>
      {/* 👇 ここ追加 */}
      <div style={{ marginTop: "30px" }}>
        <h3>Leads一覧</h3>

        {leads.map((lead) => (
          <div key={lead.id} style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
            {lead.company_name} / {lead.contact_name}
          </div>
        ))}
      </div>

    </div>
  )
}
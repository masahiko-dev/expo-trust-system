"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AfterLoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()

      if (data?.user) {
        setStatus("success")

        setTimeout(() => {
          router.push("/companies")
        }, 800)

      } else {
        setStatus("error")
      }
    }

    check()
  }, [router])

  if (status === "loading") {
    return (
      <div style={{ padding: 40 }}>
        <h2>ログイン処理中...</h2>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div style={{ padding: 40 }}>
        <h2>ログインしました</h2>
        <p>画面を移動しています...</p>
      </div>
    )
  }

  // ❌ エラーUI
  return (
    <div style={{ padding: 40 }}>
      <h2>ログインリンクの有効期限が切れています</h2>

      <p style={{ marginTop: 10 }}>
        もう一度ログインリンクを送信してください
      </p>

      {/* 🔵 ログイン画面へ戻る */}
      <button
        onClick={() => router.push("/login")}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          borderRadius: 8,
          background: "#6b7280",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginRight: 10
        }}
      >
        戻る
      </button>

      {/* 🔵 再送 */}
      <button
        onClick={() => router.push("/login?retry=1")}
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          background: "#2563eb",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        再送する
      </button>
    </div>
  )
}
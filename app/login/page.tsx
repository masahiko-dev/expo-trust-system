"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const params = useSearchParams()
  const token = params.get("token")

  const [email, setEmail] = useState("")

  const sendMagicLink = async () => {
    if (!email) {
      alert("メールアドレスを入力してください")
      return
    }

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    })

    alert("ログインリンクを送信しました")
  }

  // =========================
  // 🧑‍💼 ログイン画面（既存ユーザー）
  // =========================
  if (!token) {
    return (
      <div style={{ padding: 40 }}>
        <h1>ログイン</h1>

        <input
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button onClick={sendMagicLink}>
          ログインリンクを送る
        </button>
      </div>
    )
  }

  // =========================
  // 👤 tokenあり（今回は使わない）
  // =========================
  return (
    <div style={{ padding: 40 }}>
      <h1>このページは使用しません</h1>
    </div>
  )
}
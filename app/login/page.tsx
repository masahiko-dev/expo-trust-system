"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// =========================
// 実際のログイン画面
// =========================
function LoginContent() {
  const params = useSearchParams()
  const token = params.get("token")

  const [email, setEmail] = useState("")

  const sendMagicLink = async () => {
    if (!email) {
      alert("メールアドレスを入力してください")
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error(error)
      alert("送信に失敗しました")
      return
    }

    alert("ログインリンクを送信しました")
  }

  // =========================
  // ログイン画面
  // =========================
  if (!token) {
    return (
      <div style={{ padding: 40 }}>
        <h1>ログイン</h1>

        <input
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 12,
            width: 300,
            marginBottom: 12,
            display: "block",
          }}
        />

        <button
          onClick={sendMagicLink}
          style={{
            padding: "12px 20px",
            cursor: "pointer",
          }}
        >
          ログインリンクを送る
        </button>
      </div>
    )
  }

  // =========================
  // tokenあり
  // =========================
  return (
    <div style={{ padding: 40 }}>
      <h1>このページは使用しません</h1>
    </div>
  )
}

// =========================
// Suspenseでラップ
// =========================
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
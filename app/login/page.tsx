"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase" // 🔥 ここに変更

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email) {
      alert("メールアドレスを入力してください")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // emailRedirectTo: "http://localhost:3000/auth/callback"
        emailRedirectTo: "http://localhost:3000/companies"
      }
    })

    if (!error) {
      setSent(true)
    } else {
      alert(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>ログイン</h1>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "送信中..." : "ログインリンクを送信"}
      </button>

      {sent && <p>メール送信しました</p>}
    </div>
  )
}
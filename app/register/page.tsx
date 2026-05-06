"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RegisterPage() {
  const params = useSearchParams()
  const router = useRouter()

  const token = params.get("token")

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  // 🔒 tokenなしは即リジェクト
    useEffect(() => {
    if (!token) {
        router.push("/")
        return
    }

    // 🔥 tokenの有効性チェック
    fetch(`/api/invite/verify?token=${token}`)
        .then(res => res.json())
        .then(data => {
        if (!data.success) {
            alert("無効なリンクです")
            router.push("/")
        }
        })
    }, [token, router])

  // 🔐 MagicLink送信（登録用）
  const handleRegister = async () => {
    if (!email) {
      alert("メールアドレスを入力してください")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?token=${token}`
      }
    })

    if (error) {
      alert(error.message)
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  if (!token) return null

  return (
    <div style={{ padding: 40 }}>
      <h1>ユーザー登録</h1>

      <input
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={handleRegister} disabled={loading}>
        {loading ? "送信中..." : "登録リンクを送る"}
      </button>

      {sent && <p>メールを送信しました</p>}
    </div>
  )
}
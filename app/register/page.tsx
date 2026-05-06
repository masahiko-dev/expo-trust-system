"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// =========================
// 実処理
// =========================
function RegisterContent() {
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

    // 🔥 token有効性確認
    fetch(`/api/invite/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          alert("無効なリンクです")
          router.push("/")
        }
      })
  }, [token, router])

  // 🔐 MagicLink送信
  const handleRegister = async () => {
    if (!email) {
      alert("メールアドレスを入力してください")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?token=${token}`,
      },
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
        style={{
          padding: 12,
          width: 300,
          marginBottom: 12,
          display: "block",
        }}
      />

      <button
        onClick={handleRegister}
        disabled={loading}
        style={{
          padding: "12px 20px",
          cursor: "pointer",
        }}
      >
        {loading ? "送信中..." : "登録リンクを送る"}
      </button>

      {sent && (
        <p style={{ marginTop: 20 }}>
          メールを送信しました
        </p>
      )}
    </div>
  )
}

// =========================
// Suspense wrapper
// =========================
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
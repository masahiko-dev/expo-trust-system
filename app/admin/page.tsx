"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 🔐 管理者メール
const ADMIN_EMAIL = "masahiko.yamada.cp@gmail.com"

export default function AdminPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [allowed, setAllowed] = useState(false)

  // 🔐 管理者チェック
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "/"
        return
      }

      setAllowed(true)
    }

    checkUser()
  }, [])

  // 🔥 招待リンク発行
  const createInvite = async () => {
    setLoading(true)

    const res = await fetch("/api/admin/create-invite", {
      method: "POST"
    })

    const data = await res.json()

    if (data.url) {
      setUrl(data.url)
    } else {
      alert("エラー：" + data.error)
    }

    setLoading(false)
  }

  if (!allowed) return <div>Checking...</div>

  return (
    <div style={{ padding: 40 }}>
      <h1>招待リンク発行</h1>

      <button onClick={createInvite} disabled={loading}>
        {loading ? "作成中..." : "招待リンク作成"}
      </button>

      {url && (
        <div style={{ marginTop: 20 }}>
          <p>このURLをユーザーに送ってください</p>
          <textarea
            value={url}
            readOnly
            style={{ width: 400, height: 80 }}
          />
        </div>
      )}
    </div>
  )
}
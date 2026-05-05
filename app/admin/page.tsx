"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 🔐 管理者メール
const ADMIN_EMAIL = "masahiko.yamada.cp@gmail.com"

export default function AdminPage() {
  const [accountId, setAccountId] = useState("")
  const [url, setUrl] = useState("")
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user || user.email !== ADMIN_EMAIL) {
        alert("アクセス権限がありません")
        window.location.href = "/"
        return
      }

      setAllowed(true)
    }

    checkUser()
  }, [])

  const createInvite = async () => {
    const res = await fetch("/api/admin/create-invite", {
      method: "POST",
      body: JSON.stringify({
        secret: "my-secret-key",
        accountId,
        email: null,
      }),
    })

    const data = await res.json()
    setUrl(data.url)
  }

  if (!allowed) return <div>Checking...</div>

  return (
    <div style={{ padding: 40 }}>
      <h1>招待リンク発行</h1>

      <input
        placeholder="accountId"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      />

      <button onClick={createInvite}>発行</button>

      {url && (
        <div>
          <p>発行URL</p>
          <textarea value={url} readOnly style={{ width: 400 }} />
        </div>
      )}
    </div>
  )
}
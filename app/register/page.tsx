"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function RegisterPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")

  const [valid, setValid] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (!token) return

    fetch(`/api/invite/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setValid(true)
        } else {
          alert("無効なリンクです")
        }
      })
  }, [token])

  const handleRegister = async () => {
    const res = await fetch("/api/invite/register", {
      method: "POST",
      body: JSON.stringify({ email, password, token }),
    })

    const data = await res.json()

    if (data.success) {
      router.push("/onboarding")
    } else {
      alert(data.error)
    }
  }

  if (!valid) return <div>確認中...</div>

  return (
    <div>
      <h1>登録</h1>

      <input
        placeholder="メール"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleRegister}>
        登録する
      </button>
    </div>
  )
}
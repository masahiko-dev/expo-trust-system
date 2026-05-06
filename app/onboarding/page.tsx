"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()

  const [target, setTarget] = useState("")
  const [strength1, setStrength1] = useState("")
  const [strength2, setStrength2] = useState("")
  const [strength3, setStrength3] = useState("")
  const [reason1, setReason1] = useState("")
  const [reason2, setReason2] = useState("")
  const [reason3, setReason3] = useState("")
  const [achievements, setAchievements] = useState("")
  const [loading, setLoading] = useState(false)

const handleSubmit = async () => {

    // 🔥 ここ追加（最初に）
    if (!target || !strength1 || !reason1) {
        alert("最低限入力してください")
        return
    }

    setLoading(true)

    const res = await fetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
        target,
        strengths: [strength1, strength2, strength3],
        reasons: [reason1, reason2, reason3],
        achievements
        })
    })

    const data = await res.json()

    setLoading(false)

    if (data.success) {
    router.refresh()
    router.replace("/companies")
    } else {
    alert("エラー")
    }
    }


  return (
    <div style={{ padding: 40 }}>
      <h1>初期設定</h1>
      <p>AIの精度を上げるために入力してください</p>

      <h3>ターゲット</h3>
      <textarea value={target} onChange={(e) => setTarget(e.target.value)} />

      <h3>強み（3つ）</h3>
      <input value={strength1} onChange={(e) => setStrength1(e.target.value)} />
      <input value={strength2} onChange={(e) => setStrength2(e.target.value)} />
      <input value={strength3} onChange={(e) => setStrength3(e.target.value)} />

      <h3>選ばれる理由（3つ）</h3>
      <input value={reason1} onChange={(e) => setReason1(e.target.value)} />
      <input value={reason2} onChange={(e) => setReason2(e.target.value)} />
      <input value={reason3} onChange={(e) => setReason3(e.target.value)} />

      <h3>実績</h3>
      <textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} />

      <br /><br />

    <button onClick={handleSubmit} disabled={loading}>
    {loading ? "設定中..." : "設定を完了する"}
    </button>
    </div>
  )
}
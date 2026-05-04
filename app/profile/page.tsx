"use client"

import { useEffect, useState } from "react"

type Profile = {
  target: string
  strengths: string[]
  reasons: string[]
  achievements: string[]
}

const emptyProfile: Profile = {
  target: "",
  strengths: ["", "", ""],
  reasons: ["", "", ""],
  achievements: ["", "", ""],
}

const strengthsPlaceholder = [
  "営業フォローを自動化し、対応漏れを防ぐ",
  "30日間のフォロー設計を自動生成できる",
  "AIが状況に応じたメール文章を作成する"
]

const reasonsPlaceholder = [
  "展示会後のフォローに特化しているため",
  "誰でも同じ品質で営業フォローできるため",
  "短期間で商談化率を改善できるため"
]

const achievementsPlaceholder = [
  "展示会後の商談化率が2倍に改善",
  "フォロー対応時間を70%削減",
  "受注までのリードタイムを短縮"
]


export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/account-profile")
      const json = await res.json()

      if (json.profile) {
        setProfile({
          target: json.profile.target ?? "",
          strengths: normalize3(json.profile.strengths),
          reasons: normalize3(json.profile.reasons),
          achievements: normalize3(json.profile.achievements),
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  function normalize3(value: string[] | null | undefined) {
    const arr = Array.isArray(value) ? value : []
    return [arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""]
  }

  function updateArray(
    key: "strengths" | "reasons" | "achievements",
    index: number,
    value: string
  ) {
    setProfile((prev) => {
      const next = [...prev[key]]
      next[index] = value
      return { ...prev, [key]: next }
    })
  }

  async function saveProfile() {
    setSaving(true)
    setMessage("")

    const res = await fetch("/api/account-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    })

    if (res.ok) {
      setMessage("保存しました")
    } else {
      setMessage("保存に失敗しました")
    }

    setSaving(false)
  }

  if (loading) {
    return <main className="p-8">読み込み中...</main>
  }

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-bold mb-2">自社プロフィール</h1>
      <p className="text-gray-600 mb-8">
        ここに入力した内容が、AIメール生成の前提情報として使われます。
      </p>

      <section className="mb-8">
        <p className="text-sm text-gray-500 mb-2">
        誰に営業するか（業種・役職・状況）を具体的に書いてください
        </p>
        <label className="block font-bold mb-2">ターゲット</label>
        <textarea
          className="w-full border rounded p-3 min-h-[170px]"
          value={profile.target}
          onChange={(e) =>
            setProfile({ ...profile, target: e.target.value })
          }
            placeholder={`展示会で名刺交換した
・製造業の営業企画責任者
・DX推進担当者

状態：
「興味はあるが手が回っていない」
        `}
        />
      </section>

        <p className="text-sm text-gray-500 mb-2">
        あなたのサービスの特徴（何ができるか）
        </p>
        <InputGroup
        title="強み 3つ"
        values={profile.strengths}
        onChange={(i, v) => updateArray("strengths", i, v)}
        placeholders={strengthsPlaceholder}
        />

        <p className="text-sm text-gray-500 mb-2">
        なぜ他ではなく選ばれるのか（差別化ポイント）
        </p>
        <InputGroup
        title="選ばれた理由 3つ"
        values={profile.reasons}
        onChange={(i, v) => updateArray("reasons", i, v)}
        placeholders={reasonsPlaceholder}
        />

        <p className="text-sm text-gray-500 mb-2">
        導入後に得られる結果（数字や変化）
        </p>
        <InputGroup
        title="成果 3つ"
        values={profile.achievements}
        onChange={(i, v) => updateArray("achievements", i, v)}
        placeholders={achievementsPlaceholder}
        />

      <button
        onClick={saveProfile}
        disabled={saving}
        className="bg-black text-white px-6 py-3 rounded font-bold"
      >
        {saving ? "保存中..." : "保存する"}
      </button>

      {message && <p className="mt-4">{message}</p>}
    </main>
  )
}


function InputGroup({
  title,
  values,
  onChange,
  placeholders
}: {
  title: string
  values: string[]
  onChange: (index: number, value: string) => void
  placeholders: string[]
}) {
  return (
    <section className="mb-8">
      <h2 className="font-bold mb-3">{title}</h2>

      {[0, 1, 2].map((i) => (
        <input
          key={i}
          className="w-full border rounded p-3 mb-3"
          value={values[i] ?? ""}
          onChange={(e) => onChange(i, e.target.value)}
          placeholder={placeholders[i]} // ←ここが変更点
        />
      ))}
    </section>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  company_name: string
  expo_name?: string
  temperature?: string
}

type CompanyRow = {
  company_name: string
  expo_name?: string
  temperature?: string
  leadId: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      // 👇 1回待つ（これが本質）
      await new Promise((r) => setTimeout(r, 300))

      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.replace("/login")
        return
      }

      load()
    }

    checkAuth()
  }, [router])

  async function load() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/leads", {
        credentials: "include"
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "取得に失敗しました")
        setCompanies([])
        return
      }

      if (!Array.isArray(data)) {
        setError("想定外のデータ形式です")
        setCompanies([])
        return
      }

      const map = new Map<string, CompanyRow>()

      data.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      data.forEach((lead: Lead) => {
      if (!lead.company_name) return

      const existing = map.get(lead.company_name)

      // まだ未登録
      if (!existing) {
        map.set(lead.company_name, {
          company_name: lead.company_name,
          expo_name: lead.expo_name,
          temperature: lead.temperature,
          leadId: lead.id
        })
        return
      }

      // 🔥 expo_nameが空 → 上書き
      if (!existing.expo_name && lead.expo_name) {
        map.set(lead.company_name, {
          company_name: lead.company_name,
          expo_name: lead.expo_name,
          temperature: lead.temperature,
          leadId: lead.id
        })
      }
    })

      setCompanies(Array.from(map.values()))
    } catch (e) {
      console.error("load error", e)
      setError("通信エラーが発生しました")
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  return (

    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>
        Companies
      </h1>

{/* テスト */}
      {/* <button
  onClick={async () => {
    const res = await fetch("/api/leads/create", {
      method: "POST"
    })

    const data = await res.json()
    console.log(data)

    alert("作成しました")
  }}
  style={{
    marginBottom: 20,
    padding: "10px 20px",
    background: "black",
    color: "white",
    borderRadius: 8
  }}
>
  テストリード作成
</button> */}

      {loading && <p>読み込み中...</p>}

      {!loading && error && (
        <p style={{ color: "crimson", marginBottom: 16 }}>
          {error}
        </p>
      )}

      {!loading && !error && companies.length === 0 && (
        <p>データがありません</p>
      )}

      {!loading && !error && companies.map((c) => (
        <Link
          key={c.company_name}
          href={`/timeline/${c.leadId}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            style={{
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              marginBottom: 12,
              background: "white",
              cursor: "pointer"
            }}
          >
            <div style={{ fontWeight: "bold" }}>
              {c.company_name}
            </div>

            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {c.expo_name || "イベント未設定"}
            </div>

            <div
              style={{
                fontSize: 12,
                marginTop: 6,
                color:
                  c.temperature === "A"
                    ? "red"
                    : c.temperature === "B"
                    ? "orange"
                    : "#666"
              }}
            >
              温度：{c.temperature || "C"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
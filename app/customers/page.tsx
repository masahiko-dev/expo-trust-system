"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Company = {
  id: string
  name: string
  industry?: string
  temperature?: string
  next_action?: string
  lead_id: string   // 🔥 これ追加（必須）
}

export default function CustomersPage() {

  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    try {
      const res = await fetch("/api/companies", {
        credentials: "include"
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "取得失敗")
      }

      setCompanies(data || [])
    } catch (e) {
      console.error("load error", e)
    } finally {
      setLoading(false)
    }
  }

  async function updateNextAction(id: string, value: string) {
    try {
      setUpdatingId(id)

      const res = await fetch("/api/companies/update-next-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          companyId: id,
          nextAction: value
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "更新失敗")
      }

    } catch (e) {
      console.error("update error", e)
      alert("更新に失敗しました")
    } finally {
      setUpdatingId(null)
    }
  }

  function getTemperatureColor(temp?: string) {
    if (temp === "A") return "red"
    if (temp === "B") return "orange"
    return "#6b7280"
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "40px auto",
        fontFamily: "sans-serif"
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 30 }}>
        顧客一覧
      </h1>

      {loading && <p>読み込み中...</p>}

      {!loading && companies.length === 0 && (
        <p>データがありません</p>
      )}

      {companies.map((company) => (
        <div
          key={company.id}
          onClick={() => router.push(`/timeline/${company.lead_id}`)} // 🔥 修正
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 20,
            marginBottom: 16,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}
        >
          {/* 会社名 */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 700
            }}
          >
            {company.name}
          </div>

          {/* 業種 */}
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: 4
            }}
          >
            {company.industry}
          </div>

          {/* 温度 */}
          <div
            style={{
              marginTop: 10,
              display: "inline-block",
              background: "#fef3c7",
              color: getTemperatureColor(company.temperature),
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            温度 {company.temperature || "C"}
          </div>

          {/* 次アクション */}
          <div
            style={{
              fontSize: 13,
              color: "#374151",
              marginTop: 10
            }}
          >
            次アクション：

            <input
              defaultValue={company.next_action || ""}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) =>
                updateNextAction(company.id, e.target.value)
              }
              placeholder="次アクション入力"
              style={{
                marginLeft: 8,
                padding: "4px 6px",
                border: "1px solid #e5e7eb",
                borderRadius: 4,
                fontSize: 12,
                width: 200
              }}
            />

            {updatingId === company.id && (
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                保存中...
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
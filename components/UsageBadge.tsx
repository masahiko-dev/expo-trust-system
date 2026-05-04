"use client"

import { useEffect, useState } from "react"
// import UsageBadge from "@/components/UsageBadge"

type UsageData = {
  plan: "free" | "trial" | "poc" | "standard"
  used: number
  limit: number | null
  remaining: number | null
}

export default function UsageBadge() {
  const [data, setData] = useState<UsageData | null>(null)

  useEffect(() => {
    const fetchUsage = async () => {
      const res = await fetch("/api/account/usage")
      const json = await res.json()
      setData(json)
    }

    fetchUsage()
  }, [])

  if (!data) return null

  const { plan, used, limit, remaining } = data

  const planLabelMap = {
    free: "無料プラン",
    trial: "トライアルプラン",
    poc: "PoCプラン",
    standard: "スタンダードプラン",
    }

    if (plan === "standard") {
    return (
        <div style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: "#ecfdf5",
        color: "#047857",
        fontWeight: 700,
        marginBottom: 16
        }}>
        スタンダード（無制限）
        </div>
    )
    }
    if (remaining === null || limit === null) {
        return null
    }

  const isDanger = remaining <= 1

  return (
    <div style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1000,

        padding: "12px 14px",
        borderRadius: 10,
        background: isDanger ? "#fef2f2" : "#ffffff",
        border: isDanger ? "1px solid #fecaca" : "1px solid #e5e7eb",
        color: isDanger ? "#b91c1c" : "#374151",
        fontWeight: 700,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
        }}>
    <div>
    {planLabelMap[plan]}
    </div>
        <div style={{ fontSize: 14, marginTop: 4 }}>
        残り {remaining} / {limit} 件
        <span style={{ marginLeft: 8, color: "#6b7280" }}>
            使用済み {used} 件
        </span>
        </div>

        {remaining === 1 && (
        <div style={{ fontSize: 12, marginTop: 6, color: "#b45309" }}>
            あと1件で上限です。続ける場合はご相談ください。
        </div>
        )}

        {remaining === 0 && (
        <div style={{ fontSize: 12, marginTop: 6, color: "#dc2626" }}>
            上限に達しました。続けるにはプランの変更が必要です。
            
            <div style={{ marginTop: 6 }}>
            <a
                // href="/contact"
                href="https://forms.gle/4v2rQfcTN9guTbYc7"
                style={{
                color: "#4f46e5",
                textDecoration: "underline",
                fontWeight: 500
                }}
            >
                担当に相談する →
            </a>
            </div>
        </div>
        )}
      {/* <div style={{ fontSize: 14, marginTop: 4 }}>
        残り {remaining} / {limit} 件
        <span style={{ marginLeft: 8, color: "#6b7280" }}>
          使用済み {used} 件
        </span>
      </div>
        {remaining === 1 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>
            あと少しで上限です。続ける場合はご相談ください。
        </div>
        )}

        {remaining === 0 && (
        <div style={{ fontSize: 12, marginTop: 6, color: "#dc2626" }}>
            上限に達しました。続けるにはプランの変更が必要です。
        </div>
        )} */}
    </div>
  )
}
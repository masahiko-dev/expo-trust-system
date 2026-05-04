"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getDisplayByActionType } from "@/lib/flow"
import MailModal from "@/components/MailModal"

type Lead = {
  id: string
  company_id?: string
  company_name?: string
  contact_name?: string
  expo_name?: string
  event_id?: string
  brand_id?: string
  website?: string
  website_summary_line?: string
  temperature?: "A" | "B" | "C" | string
  deal_status?: "HOT" | "WARM" | "COLD" | "MEETING" | "LOST" | string
  contacts?: {
    id: string
    conversation_note?: string
    pain_point?: string
  }[]
  events?: {
    event_name: string
  } | null
}

type RelatedLead = {
  id: string
  contact_name?: string
  email?: string
  company_name?: string
  expo_name?: string
  is_primary?: boolean
}

type Task = {
  id: string
  task_type?: string
  action_type?: string
  due_date?: string
  is_sent?: boolean
}

type MailLog = {
  id: string
  mail_text: string
  sent_at?: string
  task_type?: string
  direction?: "outbound" | "inbound" | string
}

type TimelineEvent = {
  id: string
  event_type: string | null
  event_source: string | null
  occurred_at: string | null
  title: string | null
  description: string | null
}


export default function TimelinePage() {
  const router = useRouter()
  const params = useParams()

  const leadId = Array.isArray(params.leadId)
    ? params.leadId[0]
    : params.leadId

  const [lead, setLead] = useState<Lead | null>(null)
  const [relatedLeads, setRelatedLeads] = useState<RelatedLead[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [mailLogs, setMailLogs] = useState<MailLog[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [nextAction, setNextAction] = useState<Task | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [mailText, setMailText] = useState("")
  const [openLogId, setOpenLogId] = useState<string | null>(null)

  const [showContactModal, setShowContactModal] = useState(false)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState("")

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingMailId, setLoadingMailId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [previewMail, setPreviewMail] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)

  const [replyText, setReplyText] = useState("")

  //conversationNote保存
  const [conversationNote, setConversationNote] = useState("")
  const [painPoint, setPainPoint] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const temp = useMemo(() => {
    return ["A", "B", "C"].includes(lead?.temperature || "")
      ? (lead?.temperature as "A" | "B" | "C")
      : "C"
  }, [lead])

  const mergedEvents = useMemo(() => {

    const mailEvents = mailLogs.map((log) => {
      const raw = log.mail_text || ""

      const uniqueText = raw
        .split("\n")
        .filter((line, index, arr) => arr.indexOf(line) === index)
        .join("\n")
        .trim()
      return {
        id: log.id,

          title:
            log.direction === "inbound"
              ? "返信あり"
              : log.task_type
              ? `メール送信（${getDisplayByActionType(log.task_type)}）`
              : "メール送信",


        description: uniqueText.slice(0, 100),

        event_type: "メール送信",
        // event_source: uniqueText.slice(0, 50),
        event_source: "",
        occurred_at: log.sent_at || new Date().toISOString(),
      }
    })

    console.log(mailLogs)

    return [...events, ...mailEvents].sort((a, b) => {
      const da = new Date(a.occurred_at || "").getTime()
      const db = new Date(b.occurred_at || "").getTime()
      return db - da
    })
  }, [events, mailLogs])

  const tempLabel =
    temp === "A" ? "高" :
    temp === "B" ? "中" :
    "低"

  const bg =
    temp === "A" ? "#fee2e2" :
    temp === "B" ? "#fef3c7" :
    "#f3f4f6"

  const textColor =
    temp === "A" ? "#991b1b" :
    temp === "B" ? "#92400e" :
    "#374151"

  const isDanger = !relatedLeads.find((l) => l.is_primary)?.contact_name

  async function apiGet(url: string) {
    const res = await fetch(url, { credentials: "include" })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "取得に失敗しました")
    }

    return data
  }

  async function apiPost(url: string, body: Record<string, any>) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "処理に失敗しました")
    }

    return data
  }

  function getEventIcon(type?: string) {
    if (!type) return "📌"
    if (type.includes("exhibition")) return "🤝"
    if (type.includes("email")) return "📧"
    if (type.includes("call")) return "📞"
    if (type.includes("task")) return "📅"
    if (type.includes("フォローメール")) return "📧"
    return "📌"
  }

  function getDayKeyFromTaskType(taskType?: string) {
    if (!taskType) return "day0"

    if (taskType.startsWith("Day0")) return "day0"
    if (taskType.startsWith("Day7")) return "day7"
    if (taskType.startsWith("Day14")) return "day14"
    if (taskType.startsWith("Day21")) return "day21"
    if (taskType.startsWith("Day30")) return "day30"

    return "day0"
  }

  async function loadCompany() {
    if (!leadId) return null

    const data = await apiGet(`/api/leads/${leadId}`)

    console.log("🔥 lead data:", data)
    setLead(data)
    return data as Lead
  }

  async function loadRelatedLeads() {
    if (!leadId) return

    const data = await apiGet(`/api/leads/by-company?leadId=${leadId}`)
    setRelatedLeads(Array.isArray(data) ? data : [])
  }

  async function loadTasks() {
    if (!leadId) return

    const data = await apiGet(`/api/tasks?leadId=${leadId}`)
    setTasks(Array.isArray(data) ? data : [])
  }

  async function loadMailLogs() {
    if (!leadId) return

    const data = await apiGet(`/api/mail-logs?leadId=${leadId}`)
    setMailLogs(Array.isArray(data) ? data : [])
  }

  async function loadEvents() {
    if (!leadId) return

    const data = await apiGet(`/api/events?leadId=${leadId}`)
    setEvents(Array.isArray(data) ? data : data?.events || [])
  }

  async function loadNextAction() {
    if (!leadId) {
      setNextAction(null)
      return
    }

    const data = await apiGet(`/api/next-action?leadId=${leadId}`)
    setNextAction(data || null)
  }

  async function loadAll() {
    if (!leadId) return

    setLoadingInitial(true)

    try {
      await loadCompany()

      await Promise.all([
        loadRelatedLeads(),
        loadTasks(),
        loadMailLogs(),
        loadEvents(),
        loadNextAction(),
      ])
    } catch (e: any) {
      alert(e.message || "読み込み失敗")
    } finally {
      setLoadingInitial(false)
    }
  }

  async function setPrimary(targetLeadId: string) {
    try {
      setLoadingLeadId(targetLeadId)

      await apiPost("/api/leads/set-primary", {
        leadId: targetLeadId,
      })

      await Promise.all([loadRelatedLeads(), loadCompany()])
    } catch (e: any) {
      alert(e.message || "更新失敗")
    } finally {
      setLoadingLeadId(null)
    }
  }

  async function generateLine() {
    try {
      if (!lead?.company_id) {
        alert("company_idがありません")
        return
      }

      if (!lead?.website) {
        alert("URLがありません")
        return
      }

      await apiPost("/api/generate-summary-line", {
        companyId: lead.company_id,
        url: lead.website,
      })

      alert("生成しました")
      await loadCompany()
    } catch (e: any) {
      alert(e.message || "生成失敗")
    }
  }

  async function handleGenerateAINextAction() {
    try {
      setLoadingAI(true)

      await apiPost("/api/ai-next-action", {
        leadId,
      })

      alert("NEXT ACTIONを更新しました")
      await loadAll()
    } catch (e: any) {
      alert(e.message || "生成失敗")
    } finally {
      setLoadingAI(false)
    }
  }

  async function handleGenerateFollowPlan() {
    try {
      setLoadingPlan(true)

      await apiPost("/api/follow-plan", {
        leadId,
      })

      alert("フォロー計画を作成しました")
      await loadAll()
    } catch (e: any) {
      alert(e.message || "フォロー計画生成失敗")
    } finally {
      setLoadingPlan(false)
    }
  }

  async function handleSaveMailLog() {
  if (!confirm("履歴に保存して、このフォローを完了にしますか？")) {
    return
  }
  
    try {
      if (!nextAction?.id) {
        alert("次アクションが未設定です")
        return
      }

      setSaving(true)

      await apiPost("/api/mail-logs", {
        leadId,
        taskId: nextAction.id,
        mailText,
        taskType: nextAction.task_type,
      })

      alert("送信＆完了しました")
      setShowModal(false)

      // ③ 再読み込み（NEXT ACTION更新）
      await Promise.all([
        loadMailLogs(),
        loadNextAction(),
        loadEvents(),
        loadTasks(),
      ])

    } catch (e: any) {
      alert(e.message || "保存失敗")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateContact() {
    try {

      await apiPost("/api/leads/set-primary", {
        leadId: selectedLeadId,
      })

      setShowContactModal(false)
      setContactName("")
      await Promise.all([loadCompany(), loadRelatedLeads()])
    } catch (e: any) {
      alert(e.message || "保存失敗")
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      if (leadId) {
        loadAll()
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, router])

    useEffect(() => {
        console.log("🔥 mailLogs:", mailLogs)
    }, [mailLogs])

  const handleGenerateMail = async (taskId: string, eventId?: string) => {
    try {
      if (!nextAction) return
      setLoadingMailId(taskId)

      const res = await fetch("/api/generate-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          leadId,                     // ← 既にあるはず
          day: nextAction.task_type, // ← 既存
          eventId                    // ← ★追加
        })
      })

      if (!res.ok) {
        const json = await res.json()

        if (json.error === "プロフィール未入力です") {
          alert("先にプロフィールを入力してください")
          // router.push("/profile")
          router.push("/settings/account")
          return
        }
      }

      const data = await res.json()

      setMailText(data.mail)
      setShowModal(true)

    } catch (e) {
      alert("メール生成エラー")
    } finally {
      setLoadingMailId(null)
    }
  }

  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    fetch("/api/account-profile")
      .then(res => res.json())
      .then(data => setProfile(data.profile))
  }, [])

  const isProfileReady =
    profile?.target?.length > 0 &&
    profile?.strengths?.some((s: string) => s?.length > 0)

  const primary = relatedLeads.find((l) => l.is_primary)

  const isContactReady =
    primary?.contact_name && primary?.email

  const isReady = isContactReady && isProfileReady

  const isDirty =
  conversationNote !== lead?.contacts?.[0]?.conversation_note ||
  painPoint !== lead?.contacts?.[0]?.pain_point
  

  useEffect(() => {
    const contact = lead?.contacts?.[0]

    if (contact) {
      setConversationNote(contact.conversation_note || "")
      setPainPoint(contact.pain_point || "")
    }
  }, [lead])

  // const handleSave = async () => {
  //   const contactId = lead?.contacts?.[0]?.id

  //   if (!contactId) {
  //     alert("保存対象がありません")
  //     return
  //   }

  //   await fetch(`/api/contacts/${contactId}`, {
  //     method: "PATCH",
  //     headers: {
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       conversation_note: conversationNote,
  //       pain_point: painPoint
  //     })
  //   })

  //   alert("保存しました")
  // }

    const handleSave = async () => {
    const contact = lead?.contacts?.[0]
    if (!contact) return

    setIsSaving(true)

    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_note: conversationNote,
        pain_point: painPoint
      })
    })

    await loadCompany()

    setIsSaving(false)
  }

  

return (
    <div
      style={{
        maxWidth: 800,
        margin: "40px auto",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 30 }}>
        顧客タイムライン
      </h1>

      {loadingInitial && <p>読み込み中...</p>}

      {/* 顧客カード */}
      <div
        style={{
          background: isDanger ? "#fff7f7" : "white",
          border: isDanger ? "1px solid #fca5a5" : "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 20,
          marginBottom: 30,
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >

        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {lead?.company_name || "会社名未設定"}
        </div>

        <div
          style={{
            fontSize: 14,
            color: "#6b7280",
            marginTop: 4,
          }}
        >
          <p style={{ color: "#3b82f6", fontWeight: 600 }}>
            {lead?.events?.event_name ?? "接点未設定"}
          </p>

          {/* 🔥 ここに追加 */}
          <div style={{ marginTop: 10 }}>
            <select
              value={lead?.deal_status || "WARM"}
              onChange={async (e) => {

                if (!lead) return

                await fetch("/api/leads/update-status", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    leadId,
                    status: e.target.value
                  })
                })

                location.reload()
              }}
            >
              <option value="HOT">🔥 HOT</option>
              <option value="WARM">🟡 WARM</option>
              <option value="COLD">⚪ COLD</option>
              <option value="MEETING">🤝 商談</option>
              <option value="LOST">❌ 失注</option>
            </select>
          </div>
      
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              担当者一覧
            </div>

            {relatedLeads.map((row) => (
              <div key={row.id} style={{ marginBottom: 6 }}>
                {row.is_primary ? "●" : "○"}{" "}

                {row.contact_name || "担当者未設定"}
                <span style={{ color: "#6b7280", marginLeft: 6 }}>
                  （{row.email || "メール未設定"}）
                </span>

                {row.is_primary && (
                  <span style={{ marginLeft: 6, color: "#e11d48" }}>
                    （メイン担当）
                  </span>
                )}

                {!row.is_primary && (
                  <button
                    onClick={() => setPrimary(row.id)}
                    disabled={loadingLeadId === row.id}
                    style={{
                      marginLeft: 8,
                      background:
                        loadingLeadId === row.id ? "#d1d5db" : "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: 6,
                      cursor:
                        loadingLeadId === row.id ? "not-allowed" : "pointer",
                      fontSize: 12,
                    }}
                  >
                    {loadingLeadId === row.id
                      ? "更新中..."
                      : "メイン担当者にする"}
                  </button>
                )}
              </div>
            ))}
          </div>

{/* 🔥 リード情報（最重要） */}
<div
  style={{
    marginTop: 20,
    padding: 12,
    borderRadius: 6,
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  }}
>
  <div style={{ fontWeight: "bold", marginBottom: 8 }}>
    🧠 リード情報
  </div>

  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
    会話内容
  </div>
  <textarea
  value={conversationNote}
  onChange={(e) => setConversationNote(e.target.value)}
    style={{ width: "100%", marginBottom: 8 }}
  />

  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
    課題
  </div>
  <textarea
  value={painPoint}
  onChange={(e) => setPainPoint(e.target.value)}
    style={{ width: "100%" }}
  />
  {/* //保存ボタンここか？ */}
  {/* <button onClick={handleSave}>
    保存
  </button> */}
{isDirty && (
  <button
    onClick={handleSave}
    disabled={isSaving}
    style={{
      marginTop: 10,
      background: isSaving ? "#ccc" : "#f97316",
      color: "white",
      padding: "8px 16px",
      borderRadius: 6,
      cursor: isSaving ? "not-allowed" : "pointer"
    }}
  >
    {isSaving ? "保存中..." : "保存"}
  </button>
)}

</div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
            📩 送信対象：
            {relatedLeads.find((l) => l.is_primary)?.contact_name || "未設定"}
            <span style={{ marginLeft: 6, color: "#6b7280" }}>
              （{relatedLeads.find((l) => l.is_primary)?.email || "メール未設定"}）
            </span>

          </div>

{!isReady && (
  <div style={{ marginBottom: 10, fontSize: 13, color: "#ef4444" }}>
    ※プロフィール・担当者を設定するとメール生成できます

    <div style={{ marginTop: 6 }}>
      <a
        href="/profile"
        style={{ color: "#2563eb", textDecoration: "underline" }}
      >
        → プロフィールを設定する
      </a>
    </div>
  </div>
)}

<button
  disabled={!isReady}
  style={{
    opacity: !isReady ? 0.5 : 1,
    cursor: !isReady ? "not-allowed" : "pointer",
    // 既存のstyleはそのまま残す
  }}
></button>

          <button
            style={{
              marginTop: 10,
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              padding: "6px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
            onClick={() => setShowContactModal(true)}
          >
            担当者を設定
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "inline-block",
            background: bg,
            color: textColor,
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          温度スコア {temp}（{tempLabel}）
        </div>
      </div>

      {/* 🔥 NEXT ACTION（主役） */}
      {nextAction ? (
        <div
          style={{
            marginBottom: 30,
            background: "#fff7ed",
            border: "2px solid #f97316",
            padding: 20,
            borderRadius: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#9a3412",
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            🔥 NEXT ACTION
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {/* {nextAction.task_type || "次アクション未設定"} */}
            {nextAction?.task_type
              ? getDisplayByActionType(nextAction.task_type)
              : "次アクション未設定"}

            <span style={{ marginLeft: 6, fontSize: 12, color: "#6b7280" }}>
              （{nextAction?.task_type?.toUpperCase() || "-"}）
            </span>

          </div>

          <div
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginTop: 6,
            }}
          >
            期限：
            {nextAction.due_date
              ? new Date(nextAction.due_date).toLocaleDateString()
              : "未設定"}
          </div>

          {/* 🔥 次にやることを明示 */}
          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              color: "#374151",
            }}
          >
            👉 次にやること：
            <strong> メールを送る</strong>
            {!relatedLeads.find((l) => l.is_primary)?.contact_name && (
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 13 }}>
                ⚠️ 担当者が未設定のため送信できません
              </div>
            )}
          </div>

          {/* 🔥 主役ボタンに変更 */}
          <button
            style={{
              marginTop: 14,
              background:
                loadingMailId === nextAction.id ? "#9ca3af" : "#f97316",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor:
                loadingMailId === nextAction.id ? "not-allowed" : "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            }}
            disabled={
              loadingMailId === nextAction.id ||
              !relatedLeads.find((l) => l.is_primary)?.contact_name
            }
            onClick={() => handleGenerateMail(nextAction.id, lead?.event_id)}
          >
            {
              !relatedLeads.find((l) => l.is_primary)?.contact_name
                ? "⚠️ 担当者を設定してください"
                : loadingMailId === nextAction.id
                ? "実行中..."
                : "🔥 このアクションを実行する"
            }
          </button>

  {/* Undo */}
  <button
    onClick={async () => {
      if (!nextAction?.id) {
        alert("戻せるタスクがありません")
        return
      }

      if (!confirm("このフォローを未完了に戻しますか？")) return

      try {
        const res = await fetch("/api/tasks/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId })
        })

        const data = await res.json()

        if (!res.ok || data?.error) {
          alert(data?.error || "Undo失敗")
          return
        }

        alert("戻しました")

        await Promise.all([
          loadMailLogs(),
          loadEvents(),
          loadNextAction(),
          loadTasks(),
        ])

      } catch (e) {
        alert("通信エラー")
      }
    }}
    style={{
      fontSize: 13,
      color: "#ef4444",
      // background: "white",
      border: "1px solid #fecaca",
      padding: "10px 14px",
      marginLeft: 12,
      borderRadius: 8,
      cursor: "pointer"
    }}
  >
    ↩ 戻す
  </button>

        </div>
      ) : (
        <div
          style={{
            marginBottom: 30,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            padding: 16,
            borderRadius: 8,
            color: "#6b7280",
          }}
        >
          🔥 NEXT ACTION
          <br />
          まだアクションが生成されていません
        </div>
      )}

      {/* ホームページ要約 */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          🌐 ホームページ要約
        </div>

        {lead?.website_summary_line ? (
          <>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {lead.website_summary_line}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    lead.website_summary_line || ""
                  )
                }
                style={{
                  background: "#e5e7eb",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                コピー
              </button>

              <button
                onClick={generateLine}
                style={{
                  background: "#6366f1",
                  color: "white",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                再生成
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={generateLine}
            style={{
              background: "#6366f1",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            生成する
          </button>
        )}
      </div>

      {/* 操作ボタン */}
      <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>

        <button
          style={{
            background: loadingPlan ? "#9ca3af" : "#10b981",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: 13,
            cursor: loadingPlan ? "not-allowed" : "pointer",
          }}
          disabled={loadingPlan}
          onClick={handleGenerateFollowPlan}
        >
          {loadingPlan ? "作成中..." : "フォロー計画生成"}
        </button>
      </div>

      {/* フォロー計画 */}
      <h2 style={{ marginTop: 30, marginBottom: 16 }}>フォロー計画</h2>

      {tasks.length === 0 ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            borderRadius: 8,
            padding: 16,
            color: "#6b7280",
            marginBottom: 30,
          }}
        >
          まだフォロー計画がありません
        </div>
      ) : (
        <div style={{ marginBottom: 30 }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                background: "#f9fafb",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: 14,
                marginBottom: 10,
              }}
            >

            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {task.task_type
                ? getDisplayByActionType(task.task_type)
                : "タスク名未設定"}
              <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
                （{task.task_type?.toUpperCase() || "-"}）
              </span>
            </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 6,
                }}
              >
                期限：
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString()
                  : "未設定"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 4,
                }}
              >
                ステータス：{task.is_sent ? "送信済み" : "未送信"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* タイムライン（履歴だけ） */}
      <h2 style={{ marginTop: 30, marginBottom: 16 }}>履歴</h2>

      <div style={{ position: "relative", marginBottom: 30 }}>
        <div
          style={{
            position: "absolute",
            left: 15,
            top: 0,
            bottom: 0,
            width: 2,
            background: "#e5e7eb",
          }}
        />

      {/* 履歴表示 */}
      {mergedEvents.length === 0 ? (
        <div style={{ marginTop: 20, color: "#9ca3af" }}>
          まだ履歴はありません
        </div>
      ) : (
        <>
          {/* <h3 style={{ marginTop: 40 }}>履歴</h3> */}

          {/* タイムライン */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 15,
                top: 0,
                bottom: 0,
                width: 2,
                background: "#e5e7eb",
              }}
            />

            {mergedEvents.map((event) => (

              <div
                key={event.id}
                style={{
                  display: "flex",
                  marginBottom: 30,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 20,
                    background: "#4f46e5",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    zIndex: 2,
                  }}
                >
                  {/* {getEventIcon(event.event_type)} */}
                  {getEventIcon(event.event_type || undefined)}
                </div>

                <div
                  style={{
                    marginLeft: 20,
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 16,
                    width: "100%",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 6,
                    }}
                  >
                    {event.occurred_at
                      ? new Date(event.occurred_at).toLocaleString()
                      : ""}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {event.title || event.event_type || "アクション"}
                  </div>

                  {event.description && (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      {event.description}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                    {/* {event.event_source}*/}
                     {event.event_source || ""}
                  </div>

                  <button
                    onClick={async () => {
                      if (!confirm("この履歴を削除しますか？")) return

                      await fetch("/api/mail-logs/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ logId: event.id })
                      })

                      location.reload()
                    }}
                    style={{
                      marginTop: 10,
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0
                    }}
                  >
                    削除
                  </button>
                  
                </div>
              </div>
            ))}
          </div>
        </>
      )}
        
      </div>

      {/* 送信履歴 */}
      <h2>送信履歴</h2>

      {mailLogs.map((log) => (
        <div
          key={log.id}
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: 8,
            background: "white",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {log.sent_at ? new Date(log.sent_at).toLocaleString() : ""}
          </div>

          <div style={{ fontWeight: 700, marginTop: 4 }}>
            {lead?.company_name}
          </div>

          <div style={{ marginTop: 4 }}>
            {log.mail_text?.split("\n")[0]}
          </div>

          <button
            onClick={() => {
              setOpenLogId(openLogId === log.id ? null : log.id)
            }}
            style={{
              marginTop: 8,
              background: "transparent",
              border: "none",
              color: "#4f46e5",
              cursor: "pointer",
              padding: 0,
              fontSize: 13,
            }}
          >
            {openLogId === log.id
              ? "▼ メール本文を閉じる"
              : "▶ メール本文を見る"}
          </button>

          {openLogId === log.id && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {log.mail_text}
            </pre>
          )}
        </div>
      ))}

<div
  style={{
    marginTop: 16,
    padding: 12,
    borderRadius: 6,
    background: "#f9fafb", // ← 白じゃなく薄グレー
    border: "1px solid #e5e7eb"
  }}
>
  <div
    style={{
      fontSize: 12,
      color: "#6b7280",
      marginBottom: 6
    }}
  >
    返信内容を貼り付け
  </div>

  <textarea
    placeholder="例：資料ありがとうございます。ぜひ一度お話しさせてください。"
    value={replyText}
    onChange={(e) => setReplyText(e.target.value)}
    style={{
      width: "100%",
      minHeight: 90,
      padding: 8,
      border: "1px solid #e5e7eb",
      borderRadius: 4,
      fontSize: 13,
      background: "white",
      outline: "none"
    }}
  />

  <div style={{ marginTop: 8 }}>
    <button
      onClick={async () => {
        if (!replyText) return

        await fetch("/api/mail-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            mailText: replyText
          })
        })

        location.reload()
      }}
      style={{
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #d1d5db",
        padding: "6px 12px",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 12
      }}
    >
      返信を保存
    </button>
  </div>
</div>

      {/* メールモーダル */}
      {showModal && (
        <MailModal
      open={showModal}
      mail={mailText}
      setMail={setMailText}
      onClose={() => setShowModal(false)}
      onSave={handleSaveMailLog}
      saving={saving}
    />

      )}

      {/* 担当者モーダル */}
      {showContactModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 10,
              width: 400,
            }}
          >
            <h2>担当者を設定</h2>

            {/* <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="メールアドレス"
              style={{
                width: "100%",
                marginTop: 10,
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 6,
              }}
            /> */}

            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 6,
              }}
            >
              <option value="">担当者を選択</option>

              {relatedLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.contact_name || "未設定"}（{l.email || "メール未設定"}）
                </option>
              ))}
            </select>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 10,
              }}
            >
              <button onClick={() => setShowContactModal(false)}>
                キャンセル
              </button>

              <button onClick={handleUpdateContact}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getDisplayByActionType } from "@/lib/flow"
import MailModal from "@/components/MailModal"
import UsageBadge from "@/components/UsageBadge"

type Event = {
  id: string
  event_name: string
}

export default function Dashboard() {

//  getPriorityIcon対策
const getPriorityIcon = (priority?: string) => {
  if (priority === "A") return "🔥"
  if (priority === "B") return "⚡"
  return "•"
}

// ① stateをちゃんと定義する
const [showNextOnly, setShowNextOnly] = useState(false)
const [showTodayOnly, setShowTodayOnly] = useState(false)

// ① Hooks（useState）← 一番上にまとめる

// ① 基本
const router = useRouter()

// const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
const [selectedEventId, setSelectedEventId] = useState<string>("")
const [tasks, setTasks] = useState<any[]>([])
const [nextTask, setNextTask] = useState<any | null>(null)
const [events, setEvents] = useState<any[]>([])

// ② UI
const [previewMail, setPreviewMail] = useState("")
const [previewOpen, setPreviewOpen] = useState(false)
const [selectedTask, setSelectedTask] = useState<any>(null)

// ③ ローディング
const [loadingTemp, setLoadingTemp] = useState(false)
const [loadingPlan, setLoadingPlan] = useState(false)
const [loadingMail, setLoadingMail] = useState<string | null>(null)
const [loadingComplete, setLoadingComplete] = useState<string | null>(null)
const [loadingBulk, setLoadingBulk] = useState(false)

// ④ フィルター
const [search, setSearch] = useState("")
const [filterTemp, setFilterTemp] = useState<"ALL" | "A" | "B" | "C">("ALL")
const [showOnlyUncreated, setShowOnlyUncreated] = useState(false)
const [showFilter, setShowFilter] = useState(false)

// ⑤ その他
const [nextIndex, setNextIndex] = useState(0)
const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})
const [replyResults, setReplyResults] = useState<Record<string, string>>({})

// ② 定数（today）
// const today = new Date().toISOString().split("T")[0]
const today = new Date().toLocaleDateString("sv-SE")

// ③ 派生データ（computed）
const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter((t:any) => {

  // 🔥 追加（最重要）
  if (t.status === "won" || t.status === "lost") return false

  if (search && !t.company_name?.toLowerCase().includes(search.toLowerCase())) return false
  if (filterTemp !== "ALL" && t.temperature !== filterTemp) return false
  if (showOnlyUncreated && t.is_sent) return false
  return true
})

// const todayTasks = filteredTasks.filter((t:any) => t.due_date <= today)
const todayStr = new Date().toISOString().slice(0, 10)

const todayTasks = filteredTasks.filter((t:any) => {
  const due = new Date(t.due_date).toISOString().slice(0,10)
  return due <= todayStr
})

console.log("🔥 todayTasks:", todayTasks)

// 🎯 ミッション計算（statusベース）
const total = tasks.length

const won = tasks.filter((t:any) => t.status === "won").length
const lost = tasks.filter((t:any) => t.status === "lost").length

const done = won + lost

const remaining = total - done

const meeting = tasks.filter((t:any) => t.status === "meeting").length

const progressText = `${done} / ${total}`

let status = ""

if (remaining === 0) status = "完了"
else if (remaining <= 2) status = "商談目前"
else status = "フォロー進行中"


// ④ グルーピング（UI用）
const grouped = filteredTasks.reduce((acc:any, task:any) => {
  const name = task.company_name || "不明"
  if (!acc[name]) acc[name] = []
  acc[name].push(task)
  return acc
}, {})

// ⑤ Utility関数（ここにまとめる）
const mapTaskTypeToDay = (taskType: string) => {
  const normalized = taskType.toLowerCase().replace(/\s/g, "")
  if (normalized.includes("day0")) return "day0"
  if (normalized.includes("day7")) return "day7"
  if (normalized.includes("day14")) return "day14"
  if (normalized.includes("day21")) return "day21"
  if (normalized.includes("day30")) return "day30"
  return "day7"
}

const getStatus = (date:string) => {
  if (date < today) return { icon: "🔴", label: "期限切れ" }
  if (date === today) return { icon: "🟠", label: "今日" }
  return { icon: "⚪", label: "予定" }
}

// ⑥ API系useEffect（ここに集約）
// ① イベント取得
useEffect(() => {
  const fetchEvents = async () => {
    const res = await fetch("/api/events")
    const data = await res.json()

    console.log("🔥 events:", data) // ←ここ追加（重要）

    const safe = Array.isArray(data) ? data : []
    setEvents(safe)

    if (safe.length > 0) {
      setSelectedEventId(safe[0].id)
    }
  }

  fetchEvents()
}, [])

// ② タスク取得（超重要）
useEffect(() => {
  if (!selectedEventId) return

  const fetchAll = async () => {
    const todayRes = await fetch(`/api/tasks/today?eventId=${selectedEventId}`)
    const todayData = await todayRes.json()
    setTasks(Array.isArray(todayData) ? todayData : [])

    const nextRes = await fetch(`/api/tasks/next?eventId=${selectedEventId}`)
    const nextData = await nextRes.json()
    setNextTask(nextData)
  }

  fetchAll()
}, [selectedEventId])

// 🚀 ⑦ イベント処理（整理済みコード）
// Dashboard内にそのまま置いてOK（useEffectの下）Dashboard内にそのまま置いてOK（useEffectの下）

// 🔥 ① NEXT ACTION（最重要）
const handleNextAction = async () => {
  console.log("🔥 tasks:", tasks)

  const source = filteredTasks

  if (!source.length) {
    alert("タスクがありません")
    return
  }

  // ① 会社ごとにまとめる
  const grouped = source.reduce((acc: any, t: any) => {
    const key = t.company_name || "unknown"
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  // ② 各社の「次の1件」
  const nextActions = Object.values(grouped)
    .map((companyTasks: any) => {
      return companyTasks
        .filter((t: any) => !t.is_sent)
        .sort((a: any, b: any) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )[0]
    })
    .filter(Boolean)

  if (!nextActions.length) {
    alert("次アクションなし")
    return
  }

  // ③ ローテーション
  const target = nextActions[nextIndex % nextActions.length]

  console.log("🔥 NEXT TARGET:", target)

  setNextIndex(prev => prev + 1)
  setSelectedTask(target)

  // ④ メール生成
  const res = await fetch("/api/generate-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      companyName: target.company_name,
      conversationNote: target.conversation_note || "",
      temperature: target.temperature,
      day: mapTaskTypeToDay(target.task_type),
      leadId: target.lead_id,

      // 🔥 ここ超重要
      eventId: target.event_id
    })
  })

  // 🔥 ここに入れる（超重要）
    if (!res.ok) {
    const json = await res.json()

    if (json.error === "プロフィール未入力です") {
        alert("先にプロフィールを入力してください")
        router.push("/profile")
        return
    }

    throw new Error(json.error || "メール生成失敗")
    }

// // 👇これいらない
// if (!res.ok) {
//   alert("生成失敗")
//   return
// }

//   if (!res.ok) {
//     alert("メール生成失敗")
//     return
//   }

  const data = await res.json()

  setPreviewMail(data.mail)
  setPreviewOpen(true)
}

// 🔥 ② タスク完了（✔ボタン）
const completeTask = async (task: any) => {
  try {
    await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task })
    })

    // 🔥 再取得（最重要）
    if (selectedEventId) {
      const res = await fetch(`/api/tasks/today?eventId=${selectedEventId}`)
      const data = await res.json()

      setTasks(Array.isArray(data) ? data : [])
    }

  } catch (e) {
    alert("完了処理エラー")
  }
}

// 🔥 ③ 一括生成（フォロー計画）
const handleBulkCreate = async () => {
  if (!selectedEventId) {
    alert("イベント未選択")
    return
  }

  setLoadingBulk(true)

  try {
    const res = await fetch("/api/follow-plan/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        eventId: selectedEventId
      })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || "生成失敗")
      return
    }

    alert(`${data.count}社作成`)

    // 🔥 再取得
    const todayRes = await fetch(`/api/tasks/today?eventId=${selectedEventId}`)
    const todayData = await todayRes.json()
    setTasks(todayData)

    const nextRes = await fetch(`/api/tasks/next?eventId=${selectedEventId}`)
    const nextData = await nextRes.json()
    setNextTask(nextData)

  } catch (e) {
    alert("通信エラー")
  }

  setLoadingBulk(false)
}

// 🔥 ④ AIメール生成（個別ボタン）
const handleGenerateMail = async (task: any) => {
  setLoadingMail(task.id)

  try {
    const res = await fetch("/api/generate-mail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyName: task.company_name,
        conversationNote: task.conversation_note || "",
        temperature: task.temperature,
        day: mapTaskTypeToDay(task.task_type),
        leadId: task.lead_id,
        eventId: task.event_id
      })
    })

    // 🔥 ここに入れる（超重要）
    if (!res.ok) {
      const json = await res.json()

      if (json.error === "プロフィール未入力です") {
        alert("先にプロフィールを入力してください")
        router.push("/profile")
        return
      }

      throw new Error(json.error || "メール生成失敗")
    }

    // if (!res.ok) {
    //   alert("生成失敗")
    //   return
    // }

    const data = await res.json()

    setPreviewMail(data.mail)
    setSelectedTask(task)
    setPreviewOpen(true)

  } catch (e) {
    alert("通信エラー")
  }

  setLoadingMail(null)
}

return (
    <div style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "20px"
        }}>
        
        <UsageBadge />
        
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16
        }}>

        <div style={{
            fontSize: 12,
            color: "#666"
        }}>
            イベント
        </div>

        {events.length === 0 ? (
        <select disabled>
            <option>読み込み中...</option>
        </select>
        ) : (

            <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            >
            {events.map((e:any) => (
                <option key={e.id} value={e.id}>
                {e.event_name}
                </option>
            ))}
            </select>
        )}

    </div>

    {/* ミッション */}
    <div style={{
      padding: 16,
      background: "#f8fafc",
      borderRadius: 10,
      marginBottom: 20
    }}>
        <div style={{
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 4
        }}>
        🎯 ミッション
        </div>

        <div style={{
        fontWeight: 800,
        fontSize: 16
        }}>
        {progressText} 社 完了
        </div>

        <div style={{
        fontSize: 14,
        marginTop: 6
        }}>
        👉 残り {remaining} 社
        </div>

      {meeting > 0 && (
        <div style={{ fontSize: 12, marginTop: 4, color: "#2563eb" }}>
            うち {meeting} 社は商談中
        </div>
        )}

        <div style={{
        marginTop: 6,
        fontSize: 13,
        color: "#2563eb",
        fontWeight: 600
        }}>
        {status === "商談目前" && "👉 あと少しで商談化の可能性"}
        {status === "フォロー進行中" && "👉 フォロー継続中"}
        {status === "完了" && "✅ フォロー完了"}
        </div>
    </div>
    {nextTask && (

    <div style={{ marginTop: 8 }}>

        <div style={{
            fontSize: 12,
            color: "#9a3412",
            fontWeight: 600
        }}>
            👉 今やるべき（NEXT ACTION）
        </div>

        <div style={{
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 8
        }}>
            {nextTask.company_name}（{getDisplayByActionType(nextTask.task_type)}）
        </div>

        <div style={{ marginTop: 12, marginBottom: 24 }}>
            <button
                onClick={handleNextAction}
                style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600
                }}
            >
                ▶ 次のアクションを実行
            </button>
        </div>

    </div>
    )}

    {/* 既存UI */}

<h3 style={{fontSize:18,fontWeight:700}}>
🔥 今日やること（一覧）
</h3>

{
Object.entries(
    todayTasks.reduce((acc:any, task:any) => {

            const name = task.company_name || "不明"

            if (!acc[name]) {
            acc[name] = []
            }

            acc[name].push(task)

            return acc

        }, {})
    
    ).map(([companyName, tasks]: any) => {
        if (!tasks || tasks.length === 0) return null

        // 👇 ここに入れる
        const uniqueTasks: any[] = Object.values(
        tasks.reduce((acc:any, t:any)=>{
            const key = `${t.task_type}-${t.due_date}`
            if (!acc[key]) acc[key] = t
            return acc
        }, {})
        )


        const leadId = tasks[0]?.lead_id

        // if (!leadId) return null

        const expos = [...new Set(tasks.map((t:any) => t.expo_name))]

        const getGroupPriority = (tasks:any[]) => {

        if (tasks.some(t => t.priority === "A")) return "A"
        if (tasks.some(t => t.priority === "B")) return "B"
        return "C"

        }
        const priority = tasks[0].priority
  
  return (
    <div
      key={companyName}
      style={{
        padding:12,
        marginBottom:12,
        borderRadius:8,
        borderLeft:
          priority === "A" ? "6px solid #ef4444" :
          priority === "B" ? "6px solid #f59e0b" :
          "6px solid #d1d5db",
        background:
          priority === "A" ? "#fff5f5" :
          priority === "B" ? "#fffaf0" :
          "#fafafa"
      }}
    >

      {/* 会社名 */}
      <div style={{
        fontWeight:700,
        fontSize:16
      }}>
        {getPriorityIcon(priority)} {companyName}
        <span style={{
        marginLeft:8,
        fontSize:12,
        color:"#6b7280"
        }}>
        {expos.join(" / ")}
        </span>
      </div>

      {/* タスク一覧 */}
        <div style={{ marginTop:6 }}>

        {

        [...uniqueTasks]
        
        .sort((a:any, b:any)=>{

        const getScore = (date:string) => {
            if (date < today) return 0
            if (date === today) return 1
            return 2
        }

        const scoreA = getScore(a.due_date)
        const scoreB = getScore(b.due_date)

        if (scoreA !== scoreB) return scoreA - scoreB

        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        })

        // ✅ ② mapで描画
        .map((task:any)=>{

            // const today = new Date().toISOString().split("T")[0]

            const isToday = task.due_date === today


            const status = getStatus(task.due_date)



            const getBgColor = (date:string) => {
            if (date < today) return "#fee2e2"
            if (date === today) return "#fff7ed"
            return "#f9fafb"
            }

            const getDateColor = (date:string) => {
            if (date < today) return "#ef4444"
            if (date === today) return "#f59e0b"
            return "#6b7280"
            }

            return (
            <div
                key={task.id || `${task.task_type}-${task.due_date}`} 

                style={{
                fontSize:14,
                padding:"4px 8px",
                borderRadius:6,
                background: getBgColor(task.due_date),
                opacity: task.is_sent ? 0.5 : 1
                }}
            >

                {/* → {task.task_type} */}
                {/* {status.icon} {task.task_type} */}
                {status.icon} {getDisplayByActionType(task.task_type)}

                <span style={{
                marginLeft:8,
                fontSize:12,
                color:"#6b7280"
                }}>
                （{status.label}）
                </span>

                <span style={{
                marginLeft:8,
                fontSize:12,
                color: getDateColor(task.due_date),
                fontWeight:600
                }}>
                （{isToday ? "今日" : task.due_date}）
                </span>

            </div>
            )
        })

        }

        {leadId && (
        <button
            onClick={() => {
            router.push(`/timeline/${leadId}`)
            }}
            style={{
            marginTop: 8,
            fontSize: 12,
            color: "#4f46e5",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline"
            }}
        >
            この企業を詳しく見る →
        </button>
        )}

        </div>
    </div>

  )
})
}

    {/* <h1>今日のフォロー</h1> */}
    {/* <h3>🔥 今日やること・・</h3> */}
    <button
    disabled={loadingBulk}
    style={{
        background: loadingBulk ? "#9ca3af" : "#10b981",
        color: "white",
        border: "none",
        padding: "8px 14px",
        borderRadius: 6,
        cursor: loadingBulk ? "not-allowed" : "pointer"
    }}
    onClick={async () => {

        setLoadingBulk(true)

        try {

        const res = await fetch("/api/follow-plan/bulk", {
            method: "POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
            // expoName
            eventId: selectedEventId,
            })
        })

        const data = await res.json()

        alert(`${data.count}社のフォロー計画を作成しました`)

        if (selectedEventId) {
            const todayRes = await fetch(`/api/tasks/today?eventId=${selectedEventId}`)
            const todayData = await todayRes.json()
            setTasks(todayData)

            const nextRes = await fetch(`/api/tasks/next?eventId=${selectedEventId}`)
            const nextData = await nextRes.json()
            setNextTask(nextData)
        }

        // ✅ 成功時にもこれが必要
        setLoadingBulk(false)

        } catch (e) {
        alert("通信エラー")
        } finally {
        setLoadingBulk(false)
        }

    }}
    >
    {loadingBulk ? "一括生成中..." : "🚀 足りないフォローを一括作成"}
    </button>
    
    <div style={{marginTop:30}}>
    </div>

    <div className="max-w-4xl mx-auto mt-10">

    <h1 className="text-2xl font-semibold text-gray-800 mb-6">
    🔥 今日の営業
    </h1>

    <div className="grid grid-cols-3 gap-4 mb-8">

    <div className="bg-white border rounded-lg p-6 shadow-sm">
    <p className="text-sm text-gray-500">今日のフォロー</p>
    <p className="text-2xl font-bold">{todayTasks.length}</p>
    </div>

    <div className="bg-white border rounded-lg p-6 shadow-sm">
    <p className="text-sm text-gray-500">Aリード</p>
    <p className="text-2xl font-bold">
    {todayTasks.filter(t => t.temperature === "A").length}
    </p>
    </div>

    <div className="bg-white border rounded-lg p-6 shadow-sm">
    <p className="text-sm text-gray-500">Bリード</p>
    <p className="text-2xl font-bold">
    {todayTasks.filter(t => t.temperature === "B").length}
    </p>
    </div>

    </div>

    {todayTasks.length === 0 && (
    <div className="text-gray-500 text-sm">
    今日はフォロー予定はありません
    </div>
    )}

    {/* 👇 ここ追加 */}
    {todayTasks.length === 0 && nextTask && (
    <div style={{
        marginTop: 10,
        padding: "12px",
        background: "#f9fafb",
        borderRadius: 8,
        fontSize: 13
    }}>
        <div style={{ color: "#888", fontSize: 12 }}>
        次のフォロー予定
        </div>

        <div style={{ fontWeight: "bold" }}>
        {nextTask.company_name}
        </div>

        <div>
        {nextTask?.task_type
            ? (
            <>
                {getDisplayByActionType(nextTask.task_type)}
                <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
                （{nextTask.task_type.toUpperCase()}｜{nextTask.due_date ?? "-"}）
                </span>
            </>
            )
            : "タスクなし"}
        </div>

    </div>
    )}

    </div>

    <div style={{
      maxWidth:800,
      margin:"40px auto",
      fontFamily:"sans-serif"
    }}>

    {  
    Object.entries(grouped)
    .sort((a:any, b:any) => {

    const nextA = a[1]
        .filter((t:any)=>!t.is_sent)
        .sort((x:any,y:any)=>
        new Date(x.due_date).getTime() - new Date(y.due_date).getTime()
        )[0]

    const nextB = b[1]
        .filter((t:any)=>!t.is_sent)
        .sort((x:any,y:any)=>
        new Date(x.due_date).getTime() - new Date(y.due_date).getTime()
        )[0]

    if (!nextA) return 1
    if (!nextB) return -1

    return new Date(nextA.due_date).getTime() - new Date(nextB.due_date).getTime()
    })
    .map(([companyName, companyTasks]: any) => {

    const temp = companyTasks[0].temperature

    const uniqueTasks = Object.values(
    companyTasks.reduce((acc:any, t:any)=>{
        const key = `${t.task_type}-${t.due_date}`
        if (!acc[key]) acc[key] = t
        return acc
    }, {})
    )

    const nextTask: any = uniqueTasks
    .filter((t:any)=> !t.is_sent)
    .sort((a:any, b:any)=>{

        const getScore = (date:string) => {
        if (date < today) return 0
        if (date === today) return 1
        return 2
        }

        const scoreA = getScore(a.due_date)
        const scoreB = getScore(b.due_date)

        if (scoreA !== scoreB) return scoreA - scoreB

        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })[0] || null

    const tempColor =
    temp === "A" ? "#ef4444" :
    temp === "B" ? "#f59e0b" :
    "#9ca3af"

    const tempIcon =
    temp === "A" ? "🔥" :
    temp === "B" ? "🟡" :
    "⚪"

    const tempLabel =
    temp === "A" ? "Hot" :
    temp === "B" ? "Warm" :
    "Cold"

return (

<div
        id={`company-${companyName}`}   // 👈 これ追加
        key={companyName}
        style={{
        border:"1px solid #e5e7eb",
        borderRadius:10,
        padding:20,
        marginTop:20
        }}
    >

    <div style={{fontWeight:700,fontSize:18}}>
    {companyName}
    <div style={{ fontSize: 12, color: "#666" }}>
    {/* 担当：{tasks[0]?.contact_name || "未設定"} */}
    担当：{companyTasks[0]?.contact_name || "未設定"}
    </div>

    <div style={{
    fontSize: 12,
    color: "#6366f1",
    marginTop: 4,
    fontWeight: 600
    }}>
    {companyTasks[0].expo_name}
    </div>

    {(() => {
        const hasSent = companyTasks.some((t:any)=>t.is_sent)

        if (!hasSent) {
        return (
            <span style={{
            marginLeft: 8,
            fontSize: 12,
            color: "#6b7280",
            background: "#f3f4f6",
            padding: "2px 6px",
            borderRadius: 6
            }}>
            未対応
            </span>

        )
        }

        return null
    })()}

    </div>

 {nextTask ? (
  <div style={{
    marginTop:12,
    padding:12,
    background:"#fff7ed",
    borderRadius:8
  }}>

    <div style={{fontSize:12,color:"#9a3412"}}>
      🔥 NEXT ACTION
    </div>

    <div style={{fontWeight:600}}>
    {nextTask?.task_type
        ? `${getDisplayByActionType(nextTask.task_type)}（${nextTask.due_date ?? "-"}）`
        : "タスクなし"}
    </div>

    </div>
    ) : (
    <div style={{ marginTop:12, color:"#9ca3af" }}>
        次のタスクはありません
    </div>
    )}

    <div style={{marginTop:4,fontSize:13,color:"#6b7280"}}>

        <span style={{
        color: tempColor,
        fontWeight:600
        }}>
        {tempIcon} {tempLabel}
        </span>

        <button
        disabled={loadingTemp}
        onClick={async () => {

            setLoadingTemp(true)

            try {
                if (!companyTasks?.length) {
                alert("企業データなし")
                setLoadingTemp(false)
                return
                }

            const companyId = companyTasks[0]?.lead_id

            const res = await fetch("/api/temperature-ai",{
                method:"POST",
                headers:{
                "Content-Type":"application/json"
                },
                body: JSON.stringify({ leadId: companyId })
            })

                if(!res.ok){
                alert("温度更新失敗")
                setLoadingTemp(false)
                return
                }

            // 🔥 UI更新
            location.reload()
            
            } catch(e){
            alert("通信エラー")
            setLoadingTemp(false)
            }

        }}
        style={{
            marginLeft:10,
            background: loadingTemp ? "#9ca3af" : "#6366f1", // ← 紫に統一
            color:"white",
            border:"none",
            padding:"6px 12px",
            borderRadius:6,
            cursor: loadingTemp ? "not-allowed" : "pointer"
        }}
        >
        {loadingTemp ? "判定中..." : "AI温度判定"}
        </button>

        </div>


        <div style={{
        marginTop:16,
        paddingTop:16,
        borderTop:"1px solid #f3f4f6"
        }}>
        <div style={{
        fontSize:13,
        color:"#6b7280",
        marginBottom:6
        }}>
        フォロー計画
        </div>

        <button
        disabled={loadingPlan}
        style={{
            background: loadingPlan ? "#9ca3af" : "#6366f1", // ← 紫（AI系統一）
            color:"white",
            border:"none",
            padding:"6px 12px",
            borderRadius:6,
            cursor: loadingPlan ? "not-allowed" : "pointer"
        }}
        onClick={async()=>{

            setLoadingPlan(true)

            try {

            if (!companyTasks?.length) {
                alert("企業データなし")
                setLoadingPlan(false)
                return
            }

            // 成功
            location.reload()

            } catch(e){
            alert("通信エラー")
            setLoadingPlan(false)
            }

        }}
        >
        {loadingPlan ? "生成中..." : "フォロー計画生成"}
        </button>

        </div>

        {companyTasks
        .filter((task:any)=> !task.is_sent)
        .map((task:any)=>(         

        <div
        // key={task.id}
        key={task.id || `${task.task_type}-${task.due_date}`}
        style={{
            marginTop:12,
            opacity: task.is_sent ? 0.5 : 1,  // 👈 ここ追加
            transition: "0.2s"
        }}
        >
            <div style={{display:"flex",alignItems:"center",gap:8}}>

                <span>
                {getDisplayByActionType(task.task_type)}（{task.due_date}）
                </span>

                {task.is_sent && (
                <span style={{
                color:"#10b981",
                fontSize:12,
                fontWeight:600
                }}>
                ✔送信済
                </span>
                )}

                {!task.is_sent && (

            <button
                disabled={loadingComplete === task.id}
                onClick={async () => {

                    setLoadingComplete(task.id)

                    try {
                    await completeTask(task)
                    } catch (e) {
                    alert("完了処理でエラー")
                    }

                    setLoadingComplete(null)
                }}
                style={{
                    background: loadingComplete === task.id ? "#9ca3af" : "#374151",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 6,
                    cursor: loadingComplete === task.id ? "not-allowed" : "pointer"
                }}
                >
                {loadingComplete === task.id ? "処理中..." : "✔ 完了"}
            </button>

                )}
                
            </div>

            <div style={{
            display:"flex",
            gap:10,
            marginTop:6
            }}>

            <button
            disabled={loadingMail === task.id}
            style={{
                background: loadingMail === task.id ? "#9ca3af" : "#10b981", // 緑（生成系）
                color:"white",
                border:"none",
                padding:"6px 12px",
                borderRadius:6,
                cursor: loadingMail === task.id ? "not-allowed" : "pointer"
            }}
            onClick={async()=>{

                setLoadingMail(task.id)

                try {

                const res = await fetch("/api/generate-mail",{
                    method:"POST",
                    headers:{
                    "Content-Type":"application/json"
                    },
                    body: JSON.stringify({
                    companyName,
                    conversationNote: task.conversation_note || "",
                    temperature: task.temperature,
                    day: mapTaskTypeToDay(task.task_type),
                    leadId: task.lead_id,
                    // 👇 これ追加（超重要）
                    eventId: selectedEventId
                    })
                })

                // if(!res.ok){
                //     const data = await res.json()
                //     alert(data.error || "メール生成失敗")
                //     setLoadingMail(null)
                //     return
                // }

                if (!res.ok) {
                    const data = await res.json()

                    if (data.error === "プロフィール未入力です") {
                        alert("先にプロフィールを入力してください")
                        router.push("/profile")
                        setLoadingMail(null)
                        return
                    }

                    alert(data.error || "メール生成失敗")
                    setLoadingMail(null)
                    return
                    }

                const data = await res.json()

                setPreviewMail(data.mail)
                setSelectedTask(task)
                setPreviewOpen(true)

                } catch(e){
                alert("通信エラー")
                }

                setLoadingMail(null)

            }}
            >
            {loadingMail === task.id ? "生成中..." : "AIメール生成"}
            </button>

            </div>            
        </div>

        ))}

<div style={{ marginTop: 10 }}>

    <textarea
    placeholder="返信内容を貼り付け..."
    value={replyInputs[companyName] || ""}
    onChange={(e)=>
        setReplyInputs(prev => ({
        ...prev,
        [companyName]: e.target.value
        }))
    }
    style={{
        width:"100%",
        height:80,
        padding:8,
        border:"1px solid #ddd",
        borderRadius:6
    }}
    />

    <button
    disabled={!replyInputs[companyName]?.trim()}
    onClick={async () => {

        const res = await fetch("/api/reply-mail",{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({
                replyText: replyInputs[companyName],
                leadId: companyTasks[0]?.lead_id
            })
        })

        if (!res.ok) {
        alert("返信生成に失敗しました")
        return
        }

        const data = await res.json()

        setReplyResults(prev => ({
        ...prev,
        [companyName]: `分類: ${data.intent}\n\n${data.reply}`
        }))
        
    }}

    style={{
        marginTop:6,
        background: replyInputs[companyName]?.trim() ? "#2563eb" : "#9ca3af",
        color:"white",
        border:"none",
        padding:"6px 12px",
        borderRadius:6,
        cursor: replyInputs[companyName]?.trim() ? "pointer" : "not-allowed"
    }}

    >
    返信AI生成
    </button>

        {replyResults[companyName] && (
        <textarea
            value={replyResults[companyName]}
            readOnly
            style={{
            width:"100%",
            height:120,
            marginTop:6,
            padding:8,
            border:"1px solid #ddd",
            borderRadius:6
            }}
        />
        )}

    </div>

</div>
    )
})
}

{previewOpen && (
<MailModal
  open={previewOpen}
  mail={previewMail}
  setMail={setPreviewMail}
  onClose={() => setPreviewOpen(false)}
//   onSave={async () => {
    onSave={async () => {
        if (!confirm("履歴に保存して、このタスクを完了にしますか？")) {
        return
    }

    try {
        const res = await fetch("/api/mail-logs", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            leadId: selectedTask.lead_id,
            taskId: selectedTask.id,
            mailText: previewMail
        })
        })

        const data = await res.json()
        console.log("🔥 保存結果:", data)

        if (!res.ok) {
        alert("保存失敗")
        return
        }

        alert("保存成功")

        setPreviewOpen(false)

        location.reload()

    } catch (e) {
        console.error(e)
        alert("通信エラー")
    }
    
}}
    saving={false}
  />
)}

<button onClick={()=>setShowFilter(true)}>
  詳細フィルター
</button>

{showFilter && (
  <div>

    <input
      placeholder="会社名検索..."
      value={search}
      onChange={(e)=>setSearch(e.target.value)}
      style={{
        padding:10,
        border:"1px solid #ddd",
        borderRadius:6,
        width:300,
        marginBottom:20
      }}
    />

    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setShowNextOnly(false)}
        style={{
          marginRight: 8,
          padding: "6px 12px",
          background: !showNextOnly ? "#333" : "#eee",
          color: !showNextOnly ? "white" : "#333",
          border: "none",
          borderRadius: 6
        }}
      >
        すべて
      </button>

      <button
        onClick={handleNextAction}
        style={{
          padding: "6px 12px",
          background: showNextOnly ? "#2563eb" : "#eee",
          color: showNextOnly ? "white" : "#333",
          border: "none",
          borderRadius: 6
        }}
      >
        🔥 NEXT ACTION
      </button>
    </div>

    <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
      フォロー状況
    </div>

    {/* 状態 */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>状態</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setShowOnlyUncreated(false)}
          style={{
            marginRight: 8,
            padding: "6px 12px",
            background: !showOnlyUncreated ? "#333" : "#eee",
            color: !showOnlyUncreated ? "white" : "#333",
            border: "none",
            borderRadius: 6
          }}
        >
          すべて
        </button>

        <button
          onClick={() => setShowOnlyUncreated(true)}
          style={{
            padding: "6px 12px",
            background: showOnlyUncreated ? "#10b981" : "#eee",
            color: showOnlyUncreated ? "white" : "#333",
            border: "none",
            borderRadius: 6
          }}
        >
          未対応のみ
        </button>
      </div>
    </div>

    {/* 温度 */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>温度</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={()=>setFilterTemp("ALL")}>すべて</button>
        <button onClick={()=>setFilterTemp("A")}>🔥A</button>
        <button onClick={()=>setFilterTemp("B")}>🟡B</button>
        <button onClick={()=>setFilterTemp("C")}>⚪C</button>
      </div>
    </div>

    {/* 日付 */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>日付</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={()=>setShowTodayOnly(false)}>すべて</button>
        <button onClick={()=>setShowTodayOnly(true)}>今日だけ</button>
      </div>
    </div>

    {/* 🔥 閉じるボタンはここ */}
    <button onClick={()=>setShowFilter(false)}>
      閉じる
    </button>

  </div>
)}
 </div>
 </div>
)
}

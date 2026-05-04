import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const expoName = searchParams.get("expoName")
    const leadId = searchParams.get("leadId")

    const eventId = searchParams.get("eventId")

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // 🔥 user取得
    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id

    if (!userId) {
      return Response.json([])
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return Response.json([])
    }

let query = supabase
  .from("follow_tasks")
  .select(`
    id,
    task_type,
    lead_id,
    due_date,
    is_sent,
    priority,
    leads!inner (
      company_name,
      contact_name,
      temperature,
      event_id,
      status
    )
  `)
  .eq("account_id", accountId)
  .eq("is_sent", false)
  .order("due_date", { ascending: true })

  if (expoName) {
    query = query.eq("expo_name", expoName)
  }

// const today = new Date().toISOString().split("T")[0]
// ✅ OK
// const today = new Date()
// const todayStr = today.toLocaleDateString("sv-SE")

// const todayStr = new Date().toISOString().slice(0, 10)
// ✅ これにする
const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)


query = query.lte("due_date", todayStr)

if (leadId) {
  query = query.eq("lead_id", leadId)
}

    // 🔥 eventで絞る（重要）
    if (eventId) {
      query = query.eq("leads.event_id", eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return Response.json([])
    }

    const result = (data || []).map((t:any) => ({
      ...t,
      company_name: t.leads?.company_name,
      contact_name: t.leads?.contact_name,
      temperature: t.leads?.temperature,
    }))

    // 🔥 会社ごとに最優先タスクだけ抽出
    const grouped: Record<string, any> = {}

    result.forEach((t: any) => {
      const key = t.company_name || "unknown"

      if (!grouped[key]) {
        grouped[key] = t
        return
      }

      const current = grouped[key]

      const currentDate = new Date(current.due_date)
      const newDate = new Date(t.due_date)

      // 期限が早い方を優先
      if (newDate < currentDate) {
        grouped[key] = t
      }
    })

    const filteredTasks = Object.values(grouped)
  
    // if (!result || result.length === 0) {
    //   return Response.json([])
    // }
    if (!filteredTasks || filteredTasks.length === 0) {
      return Response.json([])
    }

    // 🔥 lead_id一覧
    const leadIds = result.map((t: any) => t.lead_id)

    // 🔥 contacts取得
    const { data: contacts } = await supabase
      .from("contacts")
      .select("lead_id, conversation_note")
      .eq("account_id", accountId)
      .in("lead_id", leadIds)

    const contactMap: Record<string, string> = {}

    contacts?.forEach((c: any) => {
      if (c.lead_id && c.conversation_note) {
        contactMap[c.lead_id] = c.conversation_note
      }
    })

    // const tasks = result.map((t: any) => ({
    const tasks = filteredTasks.map((t: any) => ({
      id: t.id,
      task_type: t.task_type,
      lead_id: t.lead_id,
      due_date: t.due_date,
      is_sent: t.is_sent,
      // event_id: t.event_id,
      priority: t.priority,

      event_id: t.leads?.event_id,

        company_name: t.company_name || "会社不明",
        contact_name: t.contact_name || "",
        temperature: t.temperature || "B",

        status: t.leads?.status,

        conversation_note: contactMap[t.lead_id] || ""
    }))

    return Response.json(tasks)

  } catch (e) {
    console.error(e)
    return Response.json([])
  }
}
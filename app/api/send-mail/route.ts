import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { leadId, taskId, mailText, taskType } = await req.json()

    if (!leadId || !taskId) {
      return Response.json({ error: "invalid params" }, { status: 400 })
    }

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

    // 認証
    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id
    if (!userId) {
      return Response.json({ error: "未認証" }, { status: 401 })
    }

    // account取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id
    if (!accountId) {
      return Response.json({ error: "account_idなし" }, { status: 500 })
    }

    // task確認
    const { data: task } = await supabase
      .from("follow_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("account_id", accountId)
      .single()

    if (!task) {
      return Response.json({ error: "不正タスク" }, { status: 400 })
    }

    // 🔥 保存（唯一の履歴）
    const { error } = await supabase
      .from("mail_logs")
      .insert({
        account_id: accountId,
        lead_id: leadId, // ← 絶対にcurrent
        company_id: task.company_id,
        task_id: taskId,
        task_type: task.task_type,
        mail_text: mailText,
        sent_at: new Date().toISOString()
      })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // タスク完了
    await supabase
      .from("follow_tasks")
      .update({ is_sent: true })
      .eq("id", taskId)
      .eq("account_id", accountId)

    // イベント
    await supabase.from("events").insert({
      account_id: accountId,
      lead_id: leadId,
      event_type: "mail_sent",
      title: `${task.task_type} メール送信`,
      description: mailText?.slice(0, 100) ?? "",
      occurred_at: new Date().toISOString()
    })

    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}


// GET（履歴取得）
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) return Response.json([])

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

    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id
    if (!userId) return Response.json([])

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    const { data } = await supabase
      .from("mail_logs")
      .select("*")
      .eq("account_id", accountId)
      .eq("lead_id", leadId)
      .order("sent_at", { ascending: false })

    return Response.json(data || [])

  } catch {
    return Response.json([])
  }
}
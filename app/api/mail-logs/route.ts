import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get("leadId")

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
    if (!accountId) return Response.json([])

    let query = supabase
      .from("mail_logs")
      .select("*")
      .eq("account_id", accountId)
      // .order("created_at", { ascending: false })
      .order("sent_at", { ascending: false })

    // if (leadId && leadId !== "undefined") {
    //   query = query.eq("lead_id", leadId)
    // }
    if (leadId) {
      query = query.eq("lead_id", leadId)
    }


    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message })
    }
  console.log("🔥 mailLogs result:", data)

    return Response.json(data || [])

  } catch (e: any) {
    return Response.json({ error: e.message })
  }
}

export async function POST(req: Request) {
  try {
    const { leadId, taskId, mailText, taskType, eventId } = await req.json()

    if (!leadId || !taskId) {
      return Response.json({ error: "missing params" })
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

    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id

    if (!userId) {
      return Response.json({ error: "未認証" })
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id
    if (!accountId) {
      return Response.json({ error: "account_idなし" })
    }

    // 🔥 task所有チェック
    const { data: task } = await supabase
      .from("follow_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("account_id", accountId)
      .single()

    if (!task) {
      return Response.json({ error: "不正タスク" })
    }

    // 🔥 mail_logs保存
    const { data: inserted, error } = await supabase
      .from("mail_logs")
      // .upsert({
      .insert({
        account_id: accountId,
        lead_id: leadId,
        task_type: task.task_type,
        // event_id: task.event_id,
        event_id: eventId,
        mail_text: mailText,
        task_id: taskId,
        sent_at: new Date().toISOString()
      }, 
      // {
      //   onConflict: "lead_id,task_type,event_id,account_id"
      // }
    )
      .select()
      .single()

    // if (error) {
    //   return Response.json({ error: error.message })
    // }
    if (error) {
      console.error("mail_logs insert error:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }
    // タスク完了の成功チェック
    const { error: updateError } = await supabase
      .from("follow_tasks")
      .update({ is_sent: true })
      .eq("id", taskId)
      .eq("account_id", accountId)

    if (updateError) {
      console.error(updateError)
    }

    return Response.json(inserted)

  } catch (e: any) {
    return Response.json({ error: e.message })
  }
}
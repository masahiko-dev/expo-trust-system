import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json()

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
    if (!userId) return Response.json({ error: "未認証" })

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id
    if (!accountId) return Response.json({ error: "account_idなし" })

    // 🔥 ① mail_logsから「最後に送った履歴」を取得

    /////
    // 🔥 最新の「送信済みタスク」を1件取得
    const { data: lastTask, error: taskError } = await supabase
    .from("follow_tasks")
    .select("*")
    .eq("lead_id", leadId)
    .eq("account_id", accountId)
    .eq("is_sent", true)
    .order("due_date", { ascending: false })
    .limit(1)
    .single()

    if (taskError || !lastTask) {
    return Response.json({ error: "戻せるタスクなし" }, { status: 400 })
    }

    // 🔥 未送信に戻す
    const { error: updateError } = await supabase
    .from("follow_tasks")
    .update({ is_sent: false })
    .eq("id", lastTask.id)
    .eq("account_id", accountId)

    if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
    }

    // 🔥 （任意）対応するmail_logsも削除したい場合だけ
    await supabase
    .from("mail_logs")
    .delete()
    .eq("task_id", lastTask.id)

////      
    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json({ error: e.message })
  }
}
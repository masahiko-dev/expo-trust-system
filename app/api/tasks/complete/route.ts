import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const nextMap: any = {
  "Day0": { next: "Day7", days: 7 },
  "Day7": { next: "Day14", days: 7 },
  "Day14": { next: "Day21", days: 7 },
  "Day21": { next: "Day30", days: 9 }
}

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json()

    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 })
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

    // 🔥 user取得
    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "未認証" }, { status: 401 })
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return NextResponse.json({ error: "account_idなし" }, { status: 500 })
    }

    // 🔥 current task取得
    const { data: currentTask } = await supabase
      .from("follow_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("account_id", accountId)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: "不正アクセス" }, { status: 403 })
    }

    // 🔥 完了
    await supabase
      .from("follow_tasks")
      .update({ is_sent: true })
      .eq("id", taskId)
      .eq("account_id", accountId)

    // 🔥 次のフェーズ抽出（Day0とか）
    const currentKey = currentTask.task_type.split(" ")[0]

    const next = nextMap[currentKey]

    if (!next) {
      return NextResponse.json({ ok: true })
    }

    const due = new Date()
    due.setDate(due.getDate() + next.days)

    // 🔥 次タスク生成
    await supabase
      .from("follow_tasks")
      .insert({
        account_id: accountId,
        lead_id: currentTask.lead_id,
        company_name: currentTask.company_name,

        task_type: next.next, // Day7など
        action_type: "email",

        due_date: due.toISOString().slice(0, 10),
        is_sent: false
      })

    return NextResponse.json({ ok: true })

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
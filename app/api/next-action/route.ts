import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// ===== GET（既存：次のタスク取得）=====
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
      return Response.json({ error: "leadId required" }, { status: 400 })
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
      return Response.json({ error: "未認証" }, { status: 401 })
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return Response.json({ error: "account_idなし" }, { status: 500 })
    }

    const today = new Date().toISOString().slice(0, 10)

    // 🔥 NEXT ACTION取得（ここが本質）
    const { data, error } = await supabase
      .from("follow_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .eq("account_id", accountId)
      .eq("is_sent", false)
      .order("due_date", { ascending: true })
      .limit(1)

    if (error) {
      return Response.json({ error: error.message })
    }

    return Response.json(data?.[0] || null)

  } catch (e: any) {
    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}

// ===== POST（追加：実行する）=====
export async function POST(req: Request) {
  try {
    const { taskId } = await req.json()

    if (!taskId) {
      return Response.json({ error: "taskId required" }, { status: 400 })
    }

    // const cookieStore = cookies()
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
      return Response.json({ error: "未認証" }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return Response.json({ error: "account_idなし" }, { status: 500 })
    }

    // 🔥 タスク完了
    const { error } = await supabase
      .from("follow_tasks")
      .update({ is_sent: true })
      .eq("id", taskId)
      .eq("account_id", accountId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
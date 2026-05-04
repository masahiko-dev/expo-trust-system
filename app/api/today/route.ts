import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // 🔥 認証付きSupabase
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
      return NextResponse.json([])
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return NextResponse.json([])
    }

    // 🔥 今日タスク取得
    const { data, error } = await supabase
      .from("follow_tasks")
      .select(`
        id,
        task_type,
        due_date,
        lead_id,
        leads (
          company_name,
          temperature
        )
      `)
      .eq("account_id", accountId)
      .eq("is_sent", false)
      .lte("due_date", today)
      .order("due_date", { ascending: true })

    if (error) {
      return NextResponse.json({ error })
    }

    // 🔥 UI用整形
    const tasks = data?.map((t: any) => ({
      id: t.id,
      task_type: t.task_type,
      due_date: t.due_date,
      company_name: t.leads?.company_name || "",
      temperature: t.leads?.temperature || "C"
    }))

    return NextResponse.json(tasks || [])

  } catch (e) {
    return NextResponse.json([])
  }
}
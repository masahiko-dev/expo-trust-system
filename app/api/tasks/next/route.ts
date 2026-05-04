import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
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

    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id
    if (!userId) return NextResponse.json(null)

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id
    if (!accountId) return NextResponse.json(null)

    // const todayStr = new Date().toLocaleDateString("sv-SE")
    // const todayStr = new Date().toISOString().slice(0, 10)
    // ✅ これにする
    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

    let query = supabase
      .from("follow_tasks")
      .select(`
        id,
        task_type,
        lead_id,
        due_date,
        leads!inner (
          company_name,
          event_id
        )
      `)
      .eq("account_id", accountId)
      .eq("is_sent", false)
      .gt("due_date", todayStr) // 👈 未来だけ
      .order("due_date", { ascending: true })
      .limit(1)

    if (eventId) {
      query = query.eq("leads.event_id", eventId)
    }

    const { data } = await query

    if (!data || data.length === 0) {
      return NextResponse.json(null)
    }

    const t = data[0]
    // const lead = t.leads?.[0]
    const lead = Array.isArray(t.leads) ? t.leads[0] : t.leads

    return NextResponse.json({
      task_type: t.task_type,
      due_date: t.due_date,
      company_name: lead?.company_name || ""
    })

  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}
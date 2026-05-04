import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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

    if (!userId) return NextResponse.json([])

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) return NextResponse.json([])

    // 🔥 ===== 分岐ここ =====

    // ✅ ① 一覧取得（select用）
    if (!leadId) {
      const { data } = await supabase
      .from("events")
      .select("id, event_name, event_type")
      .eq("account_id", accountId)
      .not("event_name", "is", null)
      .order("created_at", { ascending: false })

        console.log("🔥 events API raw:", data)

      return NextResponse.json(data || [])
    }

    // ✅ ② leadからイベント取得（AI用）
    const { data: lead } = await supabase
      .from("leads")
      .select("event_id")
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (!lead?.event_id) {
      return NextResponse.json([])
    }

    const { data } = await supabase
      .from("events")
      .select("id, event_name, event_type, title, description, occurred_at, created_at")
      .eq("id", lead.event_id)
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })

    return NextResponse.json(data || [])

  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}
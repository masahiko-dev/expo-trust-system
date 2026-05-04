import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
      return NextResponse.json([])
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
      return NextResponse.json([])
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return NextResponse.json([])
    }

    // 基準lead
    const { data: baseLead } = await supabase
      .from("leads")
      .select("company_id, company_name, event_id")
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (!baseLead) {
      return NextResponse.json([])
    }

    // 同一会社 × 同一イベント
    const { data } = await supabase
      .from("leads")
      .select("id, contact_name, email, company_name, event_id, is_primary")
      // .eq("company_name", baseLead.company_name)
      .eq("company_id", baseLead.company_id)
      .eq("event_id", baseLead.event_id)
      .eq("account_id", accountId)
      .order("created_at", { ascending: true })

    return NextResponse.json(data || [])

  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}

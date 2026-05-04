import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json()

    if (!leadId) {
      return Response.json({ error: "leadId missing" }, { status: 400 })
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

    // 🔥 event_idで取る
    const { data: targetLead } = await supabase
      .from("leads")
      .select("id, company_name, event_id")
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (!targetLead) {
      return Response.json({ error: "対象leadが不正" }, { status: 403 })
    }

    // 🔥 同一スコープ = company + event_id
    await supabase
      .from("leads")
      .update({ is_primary: false })
      .eq("company_name", targetLead.company_name)
      .eq("event_id", targetLead.event_id)
      .eq("account_id", accountId)

    // 🔥 対象だけtrue
    await supabase
      .from("leads")
      .update({ is_primary: true })
      .eq("id", leadId)
      .eq("account_id", accountId)

    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
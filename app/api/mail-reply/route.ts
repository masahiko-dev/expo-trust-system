import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { leadId, mailText } = await req.json()

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

    const { error } = await supabase
      .from("mail_logs")
      .insert({
        account_id: accountId,
        lead_id: leadId,
        mail_text: mailText,
        direction: "inbound", // ★ここ重要
        sent_at: new Date().toISOString()
      })

    if (error) {
      return Response.json({ error: error.message })
    }

    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json({ error: e.message })
  }
}
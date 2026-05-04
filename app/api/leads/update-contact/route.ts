import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {

    // 🔥 ここ変更
    const { leadId, contactName, email } = await req.json()

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

    // 🔥 ここも変更
    const { error } = await supabase
      .from("leads")
      .update({
        contact_name: contactName,
        email: email,
      })
      .eq("id", leadId)
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
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { logId } = await req.json()

    if (!logId) {
      return Response.json({ error: "logIdなし" }, { status: 400 })
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
    if (!userId) return Response.json({ error: "未認証" }, { status: 401 })

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id
    if (!accountId) return Response.json({ error: "account_idなし" }, { status: 500 })

    const { error } = await supabase
      .from("mail_logs")
      .delete()
      .eq("id", logId)
      .eq("account_id", accountId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
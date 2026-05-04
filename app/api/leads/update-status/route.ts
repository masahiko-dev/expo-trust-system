import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { leadId, status } = await req.json()

    if (!leadId || !status) {
      return Response.json({ ok: false, error: "missing params" })
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

    // 🔥 ユーザー取得
    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id
    if (!userId) {
      return Response.json({ ok: false, error: "未認証" })
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id
    if (!accountId) {
      return Response.json({ ok: false, error: "account_idなし" })
    }

    // 🔥 修正ポイント
    const { error } = await supabase
      .from("leads")
      .update({ deal_status: status }) // ←ここも変更
      .eq("id", leadId)
      .eq("account_id", accountId) // ←これ追加

    if (error) {
      console.error(error)
      return Response.json({ ok: false })
    }

    return Response.json({ ok: true })

  } catch (e) {
    console.error(e)
    return Response.json({ ok: false })
  }
}
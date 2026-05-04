import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { companyId, contactName } = await req.json()

    if (!companyId || !contactName) {
      return Response.json({ error: "invalid params" }, { status: 400 })
    }

    // 🔥 簡易バリデーション
    if (contactName.length > 100) {
      return Response.json({ error: "too long" }, { status: 400 })
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

    // 🔥 所有チェック + 更新
    const { error } = await supabase
      .from("companies")
      .update({
        contact_name: contactName
      })
      .eq("id", companyId)
      .eq("account_id", accountId)

    if (error) {
      return Response.json({ error: error.message })
    }

    return Response.json({ success: true })

  } catch (e: any) {
    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
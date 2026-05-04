import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json()

    if (!userId || !email) {
      return Response.json({ error: "missing" }, { status: 400 })
    }

    // 🔥 既存チェック
    const { data: existing } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .maybeSingle()

    if (existing) {
      return Response.json({ ok: true, account_id: existing.account_id })
    }

    // 🔥 account作成
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert({
        plan: "free",
        is_trial: true
      })
      .select()
      .single()

    if (accountError || !account) {
      return Response.json({ error: "account作成失敗" }, { status: 500 })
    }

    // 🔥 user作成
    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: userId,
        email,
        account_id: account.id
      })

    if (userError) {
      // 🔥 rollback（超重要）
      await supabase.from("accounts").delete().eq("id", account.id)

      return Response.json({ error: "user作成失敗" }, { status: 500 })
    }

    return Response.json({ ok: true, account_id: account.id })

  } catch (e: any) {
    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
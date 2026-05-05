import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json()

    if (!userId || !email) {
      return Response.json({ error: "missing" }, { status: 400 })
    }

    // 🔥 既存チェック（1回だけ！）
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .maybeSingle()

    if (existingError) {
      return Response.json({ error: existingError.message }, { status: 500 })
    }

    if (existing) {
      return Response.json({ ok: true, account_id: existing.account_id })
    }

    // 🔥 account作成
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert({
        name: email,
        plan_type: "trial",
        is_active: false,
        trial_limit: 3,
        trial_used: 0
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
      // 🔥 rollback
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
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

type PlanType = "free" | "trial" | "poc" | "standard"

export async function POST(req: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )

  // 🔥 ログインユーザー取得
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 })
  }

  // 🔥 usersからaccount_id取得
  const { data: userRow } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single()

  if (!userRow) {
    return NextResponse.json({ error: "accountなし" }, { status: 400 })
  }

    const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", userRow.account_id)
    .single()

    if (!account) {
    return NextResponse.json({ error: "account取得失敗" }, { status: 400 })
    }

    // 🔥 PoC期限チェック（ここに追加）
    const isExpired =
    account.plan_type === "poc" &&
    account.poc_started_at &&
    new Date().getTime() - new Date(account.poc_started_at).getTime() >
        30 * 24 * 60 * 60 * 1000

    if (isExpired) {
    return NextResponse.json(
        { error: "PoC期間が終了しています" },
        { status: 400 }
    )
    }

    const plan = account.plan_type as PlanType

    const limitMap: Record<PlanType, number> = {
    free: account.free_limit ?? 0,
    trial: account.trial_limit ?? 3,
    poc: account.poc_limit ?? 100,
    standard: Infinity,
    }

    const usedMap: Record<PlanType, number> = {
    free: account.free_used ?? 0,
    trial: account.trial_used ?? 0,
    poc: account.poc_used ?? 0,
    standard: 0,
    }

    const limit = limitMap[plan]
    const used = usedMap[plan]

    if (used >= limit) {
    return NextResponse.json(
        { error: "上限に達しています" },
        { status: 400 }
    )
    }

    // 🔥 カウント++
    if (account.plan_type === "free") {
    await supabase
        .from("accounts")
        .update({
        free_used: account.free_used + 1
        })
        .eq("id", userRow.account_id)
    }

    if (account.plan_type === "trial") {

    const { data: fresh } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", userRow.account_id)
        .single()

    if ((fresh?.trial_used ?? 0) >= (fresh?.trial_limit ?? 3)) {
        return NextResponse.json(
        { error: "上限に達しています" },
        { status: 400 }
        )
    }

    // 🔥 ここが重要：先にカウント更新
    const { data, error } = await supabase
        .from("accounts")
        .update({
            trial_used: (fresh.trial_used ?? 0) + 1
        })
        .eq("id", userRow.account_id)
        .lt("trial_used", fresh.trial_limit)
        .select()

        if (error || !data || data.length === 0) {
        return NextResponse.json(
            { error: "上限に達しています" },
            { status: 400 }
        )
        }
    }

    if (account.plan_type === "poc") {
    await supabase
        .from("accounts")
        .update({
        poc_used: account.poc_used + 1
        })
        .eq("id", userRow.account_id)
    }

    // 🔥 仮データINSERT（最後に実行）
    const { error } = await supabase.from("leads").insert({
    company_name: "テスト株式会社",
    account_id: userRow.account_id
    })

    if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
    }

  return NextResponse.json({ success: true })
}
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

type PlanType = "free" | "trial" | "poc" | "standard"

export async function GET() {

    // const cookieStore = await cookies()
    const cookieStore = (await cookies()) as any

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
            getAll() {
                return cookieStore.getAll ? cookieStore.getAll() : []
            },
            setAll() {
                // no-op
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

  // 🔥 account_id取得
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single()

  if (userError || !userRow) {
    return NextResponse.json({ error: "accountなし" }, { status: 400 })
  }

  // 🔥 account取得
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", userRow.account_id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: "account取得失敗" }, { status: 400 })
  }

  // 🔥 使用状況計算
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

  return NextResponse.json({
    plan,
    used,
    limit,
    remaining: limit === Infinity ? null : limit - used
  })
}
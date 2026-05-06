import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const body = await req.json()
  const { target, strengths, reasons, achievements } = body

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cleanStrengths = Array.isArray(strengths)
  ? strengths.filter(Boolean)
  : [strengths]

    const cleanReasons = Array.isArray(reasons)
    ? reasons.filter(Boolean)
    : [reasons]

    const cleanAchievements = Array.isArray(achievements)
    ? achievements.filter(Boolean)
    : [achievements]


  // ① account作成
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      plan_type: "trial",
      is_active: true
    })
    .select()
    .single()

  console.log("accountError:", accountError)
  console.log("account:", account)

  if (accountError || !account) {
    return NextResponse.json({ error: accountError?.message || "account作成失敗" }, { status: 500 })
  }

  // ② profile作成
  const { error: profileError } = await supabase
    .from("account_profiles")
    .insert({
        account_id: account.id,
        target,
        strengths: cleanStrengths,
        reasons: cleanReasons,
        achievements: cleanAchievements
    })

  console.log("profileError:", profileError)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // ③ user紐付け（← 外に出す）
    const { error: userError } = await supabase
  .from("users")
  .update({
    account_id: account.id
  })
  .eq("id", user.id)

  console.log("userError:", userError)
  
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
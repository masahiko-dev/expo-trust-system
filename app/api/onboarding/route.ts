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

  const { data: userRow } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single()

  const accountId = userRow?.account_id

  if (!accountId) {
    return NextResponse.json({ error: "No account" }, { status: 400 })
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      target,
      strengths,
      reasons,
      achievements,
      onboarding_completed: true,
      is_active: true
    })
    .eq("id", accountId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
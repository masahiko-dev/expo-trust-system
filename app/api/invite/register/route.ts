import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, token } = body

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

  // ① トークン確認
  const { data: invite } = await supabase
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (!invite || invite.is_used) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // ② ユーザー作成（Supabase Auth）
  const { data: userData, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = userData.user?.id

  // ③ usersテーブル紐付け
  await supabase.from("users").insert({
    id: userId,
    email,
    account_id: invite.account_id,
  })

  // ④ トークン消費
  await supabase
    .from("invite_tokens")
    .update({ is_used: true })
    .eq("token", token)

  return NextResponse.json({ success: true })
}
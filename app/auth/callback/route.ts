import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )

  // 🔐 セッション確立
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 👤 ログインユーザー取得
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    return NextResponse.redirect("http://localhost:3000/login")
  }

  // 🔍 usersテーブルに存在するか
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, account_id")
    .eq("id", user.id)
    .maybeSingle()

  let isNewUser = false

  // 🆕 初回ユーザーなら userだけ作る
//   if (!existingUser) {
//     await supabase.from("users").insert({
//       id: user.id,
//       email: user.email ?? ""
//     })
    
//     console.log("callback user.id:", user.id)

//     isNewUser = true
//   }
    if (!existingUser) {

    const { data: insertedUser, error: insertError } = await supabase
        .from("users")
        .insert({
        id: user.id,
        email: user.email ?? ""
        })
        .select()
        .single()

    console.log("insertedUser:", insertedUser)
    console.log("insertError:", insertError)

    console.log("callback user.id:", user.id)

    isNewUser = true
    }
    
  // 🔥 token消費（登録時のみ意味ある）
  const token = requestUrl.searchParams.get("token")

  if (token) {
    await supabase
      .from("invite_tokens")
      .update({ is_used: true })
      .eq("token", token)
  }

  // 🎯 リダイレクト制御
  if (isNewUser || !existingUser?.account_id) {
    return NextResponse.redirect("http://localhost:3000/onboarding")
  }

  return NextResponse.redirect("http://localhost:3000/companies")
}
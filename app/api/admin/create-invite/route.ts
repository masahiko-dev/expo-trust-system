import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// 🔐 管理者メール（残す）
const ADMIN_EMAIL = "masahiko.yamada.cp@gmail.com"

export async function POST() {
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

  // 🔐 ログインユーザー取得
  const { data } = await supabase.auth.getUser()
  const user = data.user

  // 🔐 管理者チェック
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 🔥 token生成
  const token = randomUUID()

  // 🔥 DB保存
  const { error } = await supabase.from("invite_tokens").insert({
    token,
    is_used: false
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 🔗 URL生成
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/register?token=${token}`

  return NextResponse.json({ url })
}
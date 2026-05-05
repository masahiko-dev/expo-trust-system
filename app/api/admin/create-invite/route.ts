import { NextResponse } from "next/server"
import { createInviteToken } from "@/lib/createInviteToken"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// 🔐 管理者メール
const ADMIN_EMAIL = "masahiko.yamada.cp@gmail.com"

// 🔐 仮シークレット
const ADMIN_SECRET = "my-secret-key"

export async function POST(req: Request) {
  const body = await req.json()
  const { secret, accountId, email } = body

  // 🔥 Supabase初期化（これが抜けてた）
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

  // 🔐 ユーザー取得
  const { data } = await supabase.auth.getUser()
  const user = data.user

  // 🔐 メール制限
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized (email)" }, { status: 401 })
  }

  // 🔐 シークレットチェック
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized (secret)" }, { status: 401 })
  }

  // 🔥 トークン発行
  const token = await createInviteToken(accountId, email)

  return NextResponse.json({
    url: `https://expofollow.com/register?token=${token}`,
  })
}
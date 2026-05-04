import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // const cookieStore = cookies()
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // 🔐 ユーザー取得
    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id

    if (!userId) {
      return Response.json([])
    }

    // 🔐 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return Response.json([])
    }

    // 🎯 展示会一覧取得（leadsから）
    const { data, error } = await supabase
      .from("leads")
      .select("expo_name")
      .eq("account_id", accountId)
      .not("expo_name", "is", null)

    if (error) {
      return Response.json([])
    }

    // 🔥 重複削除
    const expos = Array.from(
      new Set((data || []).map((d: any) => d.expo_name))
    )

    return Response.json(expos)

  } catch (e) {
    return Response.json([])
  }
}
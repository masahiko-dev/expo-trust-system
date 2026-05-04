import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
  try {
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

    // 🔥 user取得
    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id

    if (!userId) {
      return NextResponse.json([], { status: 401 })
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return NextResponse.json([], { status: 500 })
    }

    // 🔥 companies取得（account縛り）
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message })
    }

    return NextResponse.json(data || [])

  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
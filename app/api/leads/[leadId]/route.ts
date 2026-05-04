import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

  export async function GET(
    req: Request,
    context: { params: Promise<{ leadId: string }> }
  ) {
    try {
      const { leadId } = await context.params

      console.log("🔥 API leadId:", leadId)

      if (!leadId) {
        return NextResponse.json({ error: "id missing" }, { status: 400 })
      }
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

    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "未認証" }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    // const { data, error } = await supabase
    //   .from("leads")
    //   .select(`
    //     *,
    //     events:event_id (
    //       event_name
    //     )
    //   `)
    //   .eq("id", leadId)
    //   .eq("account_id", accountId)
    //   .single()

    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        events:event_id (
          event_name
        ),
        contacts (
          id,
          conversation_note,
          pain_point
        )
      `)
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "不明なエラー" },
      { status: 500 }
    )
  }
}
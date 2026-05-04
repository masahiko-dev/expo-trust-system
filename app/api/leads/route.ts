import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )

  // 👇 ここに追加（これが正解）
  const {
    data: { user }
  } = await supabase.auth.getUser()

  console.log("🔥 API user:", user?.id)

  // 👇 一旦チェック用に戻す（重要）
  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 })
  }

  // const { data, error } = await supabase
  //   .from("leads")
  //   .select(`
  //     id,
  //     company_name,
  //     event_id,
  //     status
  //   `)
  
  // if (error) {
  //   return NextResponse.json({ error: error.message }, { status: 500 })
  // }
  const { data, error } = await supabase
    .from("leads")
    .select(`
      id,
      company_name,
      event_id,
      temperature,
      status
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 🔥 ここから追加
  const eventIds = (data || [])
    .map(d => d.event_id)
    .filter(Boolean)

  let events: any[] = []

  if (eventIds.length > 0) {
    const { data: eventData } = await supabase
      .from("events")
      .select("id, event_name")
      .in("id", eventIds)

    events = eventData || []
  }

  // 🔥 event_id → event_name に変換
  const eventMap = new Map(
    events.map(e => [e.id, e.event_name])
  )

  const result = data.map(d => ({
    ...d,
    expo_name: eventMap.get(d.event_id) || null
  }))

  return NextResponse.json(result)
  // return NextResponse.json(data)
}
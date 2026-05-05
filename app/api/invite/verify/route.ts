import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 400 })
  }

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

  const { data } = await supabase
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (!data) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  if (data.is_used) {
    return NextResponse.json({ error: "Already used" }, { status: 401 })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 401 })
  }

  return NextResponse.json({ success: true, invite: data })
}
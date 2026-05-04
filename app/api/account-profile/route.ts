import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function createSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
        },
      },
    }
  )
}

async function getAccountId(supabase: any) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Unauthorized")
  }

  const { data: appUser, error } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single()

  if (error || !appUser?.account_id) {
    throw new Error("account_id not found")
  }

  return appUser.account_id
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabase(cookieStore)
    const accountId = await getAccountId(supabase)

    const { data, error } = await supabase
      .from("account_profiles")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      profile: data ?? {
        target: "",
        strengths: ["", "", ""],
        reasons: ["", "", ""],
        achievements: ["", "", ""],
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const cookieStore = await cookies()
    const supabase = createSupabase(cookieStore)
    const accountId = await getAccountId(supabase)

    const payload = {
      account_id: accountId,
      target: body.target ?? "",
      strengths: body.strengths ?? [],
      reasons: body.reasons ?? [],
      achievements: body.achievements ?? [],
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("account_profiles")
      .upsert(payload, { onConflict: "account_id" })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ profile: data })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "failed to save profile" },
      { status: 500 }
    )
  }
}
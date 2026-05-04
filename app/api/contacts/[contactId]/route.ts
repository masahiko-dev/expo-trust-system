import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await context.params
  const body = await req.json()

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

  if (!accountId) {
    return NextResponse.json({ error: "account_idなし" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("contacts")
    .update({
      conversation_note: body.conversation_note,
      pain_point: body.pain_point
    })
    .eq("id", contactId)
    .eq("account_id", accountId)
    .select()
    // .single()

  if (error) {
    console.log("🔥 update error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }


  const { data: before } = await supabase
  .from("contacts")
  .select("*")
  .eq("id", contactId)

console.log("before:", before)

console.log("contactId:", contactId)
console.log("accountId:", accountId)

  return NextResponse.json(data)
}
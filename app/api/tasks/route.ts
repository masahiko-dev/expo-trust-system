import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get("leadId")

  if (!leadId) {
    return Response.json({ error: "leadId required" }, { status: 400 })
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
    return Response.json({ error: "未認証" }, { status: 401 })
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", userId)
    .single()

  const accountId = userRow?.account_id

  const { data, error } = await supabase
    .from("follow_tasks")
    .select("*")
    .eq("lead_id", leadId)
    .eq("account_id", accountId) // 🔥追加
    .order("due_date", { ascending: true })

  if (error) {
    return Response.json({ error: error.message })
  }

  return Response.json(data)
}
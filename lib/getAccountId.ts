import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function getAccountId() {
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

  if (!userId) return null

  const { data: userRow } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", userId)
    .single()

  return userRow?.account_id ?? null
}
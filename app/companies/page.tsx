import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import CompaniesClient from "./CompaniesClient"

export default async function Page() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    redirect("/login")
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single()

    console.log("userRow:", userRow)
    console.log("user.id:", user.id)

  if (!userRow?.account_id) {
    redirect("/onboarding")
  }

  // ✅ 通過したらUIへ
  return <CompaniesClient />
}
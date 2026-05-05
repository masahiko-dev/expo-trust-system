import { randomBytes } from "crypto"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createInviteToken(accountId: string, email?: string) {
  const token = randomBytes(24).toString("hex")

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

  await supabase.from("invite_tokens").insert({
    token,
    account_id: accountId,
    email,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24時間
  })

  return token
}
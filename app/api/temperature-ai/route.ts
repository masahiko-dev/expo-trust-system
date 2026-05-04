import OpenAI from "openai"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json()

    if (!companyId) {
      return Response.json({ error: "invalid params" }, { status: 400 })
    }

    // 🔥 認証付きSupabase
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
      return Response.json({ error: "未認証" }, { status: 401 })
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return Response.json({ error: "account_idなし" }, { status: 500 })
    }

    // 🔥 company所属チェック
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("account_id", accountId)
      .single()

    if (!company) {
      return Response.json({ error: "不正アクセス" }, { status: 403 })
    }

    // 🔥 対象lead取得
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_id", accountId)

    const leadIds = leads?.map(l => l.id) || []

    if (leadIds.length === 0) {
      return Response.json({ temperature: "C" })
    }

    // 🔥 mail_logs取得
    const { data: logs } = await supabase
      .from("mail_logs")
      .select("mail_text")
      .in("lead_id", leadIds)
      .eq("account_id", accountId)

    const mails =
      logs?.map(l => l.mail_text).join("\n") || ""

    if (!mails) {
      return Response.json({ temperature: "C" })
    }

    // 🔥 AI判定
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
営業メール履歴から温度を判定してください。

A：商談近い
B：検討中
C：低温

必ず A / B / C の1文字のみで返してください。
`
        },
        {
          role: "user",
          content: mails.slice(0, 3000)
        }
      ]
    })

    const raw = ai.choices?.[0]?.message?.content || ""
    const temperature = raw.match(/[ABC]/)?.[0] || "C"

    // 🔥 保存
    await supabase
      .from("companies")
      .update({ temperature })
      .eq("id", companyId)
      .eq("account_id", accountId)

    return Response.json({ temperature })

  } catch (e: any) {
    console.error(e)

    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
import OpenAI from "openai"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json()

    if (!leadId) {
      return Response.json({ error: "leadId missing" }, { status: 400 })
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

    // 🔥 認証
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

    // 🔥 account取得
    const { data: account } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", accountId)
      .single()

    if (!account) {
      return Response.json({ error: "accountなし" }, { status: 400 })
    }

    // =========================================
    // 🔥 ① 上限チェック（軽いチェック）
    // =========================================
    if (account.plan_type === "trial") {
      if ((account.trial_used ?? 0) >= (account.trial_limit ?? 3)) {
        return Response.json(
          { error: "上限に達しています" },
          { status: 403 }
        )
      }
    }

    // =========================================
    // 🔥 ② カウント更新（ロック付き）←重要
    // =========================================
    if (account.plan_type === "trial") {
      const { data, error } = await supabase
        .from("accounts")
        .update({
          trial_used: (account.trial_used ?? 0) + 1
        })
        .eq("id", accountId)
        .lt("trial_used", account.trial_limit)
        .select()

      if (error || !data || data.length === 0) {
        return Response.json(
          { error: "上限に達しています" },
          { status: 403 }
        )
      }
    }

    // =========================================
    // 🔥 ③ ここで初めてAI実行
    // =========================================

    // lead取得
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (!lead) {
      return Response.json({ error: "lead not found" }, { status: 404 })
    }

    const { data: contacts } = await supabase
      .from("contacts")
      .select("name, email, conversation_note, pain_point")
      .eq("lead_id", leadId)
      .eq("account_id", accountId)

    const { data: tasks } = await supabase
      .from("follow_tasks")
      .select("task_type, due_date, is_sent, notes")
      .eq("lead_id", leadId)
      .eq("account_id", accountId)
      .order("due_date", { ascending: true })

    const { data: mails } = await supabase
      .from("mail_logs")
      .select("task_type, mail_text, sent_at")
      .eq("lead_id", leadId)
      .eq("account_id", accountId)
      .order("sent_at", { ascending: false })

    const prompt = `
以下は1件の営業リード情報です。
このリードに対する次の営業アクションを日本語で提案してください。

【lead】
${JSON.stringify(lead, null, 2)}

【contacts】
${JSON.stringify(contacts || [], null, 2)}

【follow_tasks】
${JSON.stringify(tasks || [], null, 2)}

【mail_logs】
${JSON.stringify(mails || [], null, 2)}

以下のJSONだけを返してください。

{
  "summary": "現状の要約",
  "nextAction": "次にやるべき1アクション",
  "reason": "その理由",
  "temperature": "A or B or C"
}
`

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたはBtoB営業支援の担当者です。必ずJSONのみ返してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    })

    const text = completion.choices?.[0]?.message?.content ?? "{}"
    const result = JSON.parse(text)

    return Response.json(result)

  } catch (e: any) {
    return Response.json(
      { error: e.message || "error" },
      { status: 500 }
    )
  }
}
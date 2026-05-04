import OpenAI from "openai"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const { replyText, leadId } = await req.json()

    if (!replyText || !leadId) {
      return Response.json({ error: "invalid params" }, { status: 400 })
    }

    // 🔥 Supabase（認証付き）
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

    // 🔥 ユーザー取得
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

    // 🔥 lead取得（所有チェック）
    const { data: lead } = await supabase
      .from("leads")
      .select("event_id, brand_id")
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (!lead) {
      return Response.json({ error: "lead not found" }, { status: 404 })
    }

    // ===== ① 意図判定 =====
    const classify = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
以下の返信内容を分類してください。

分類：
A：興味あり（前向き）
B：検討中（情報収集中）
C：不要・見送り
D：質問あり

必ず A / B / C / D の1文字だけで答えてください。
`
        },
        {
          role: "user",
          content: replyText
        }
      ]
    })

    const rawIntent = classify.choices?.[0]?.message?.content || ""
    const intent = rawIntent.match(/[ABCD]/)?.[0] || "B"

    // ===== ② 指示生成 =====
    let instruction = ""

    switch (intent) {
      case "A":
        instruction = "前向きなので、具体的な打ち合わせ提案をしてください"
        break
      case "B":
        instruction = "検討段階なので、情報提供＋軽い会話提案をしてください"
        break
      case "C":
        instruction = "丁寧にお礼して終了してください（営業しない）"
        break
      case "D":
        instruction = "質問に丁寧に答えつつ、自然に会話へ誘導してください"
        break
    }

    // ===== ③ 返信生成 =====
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはBtoB営業の専門家です。

対象情報：
展示会ID: ${lead.event_id ?? ""}
ブランドID: ${lead.brand_id ?? ""}

条件：
・相手の温度感に合わせる
・営業っぽくしない
・自然な日本語
・3〜5文で簡潔に

${instruction}
`
        },
        {
          role: "user",
          content: replyText
        }
      ]
    })

    const reply = completion.choices?.[0]?.message?.content || ""

    return Response.json({
      intent,
      reply
    })

  } catch (e: any) {
    console.error("reply-mail error:", e)

    return Response.json(
      { error: e.message || "failed" },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()

    if (!leadId) {
      return NextResponse.json({ error: "leadId がありません" }, { status: 400 })
    }

    // =========================
    // 🔐 認証
    // =========================
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
    console.log("🔥 auth uid:", userId)

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
      return NextResponse.json({ error: "account_idなし" }, { status: 500 })
    }

    // =========================
    // 📦 lead取得
    // =========================
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: "leadなし" }, { status: 404 })
    }

    // =========================
    // 🧠 AI（文章のみ生成）
    // =========================
    const prompt = `
以下の企業に対して、5通のフォローメール内容を作成してください。

会社名: ${lead.company_name}

条件:
・信頼関係を段階的に構築する内容
・営業的すぎず自然な流れ
・1通ずつ短め

以下のJSON形式で返してください:

{
  "messages": [
    "Day0の内容",
    "Day7の内容",
    "Day14の内容",
    "Day21の内容",
    "Day30の内容"
  ]
}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "JSONのみ返すこと" },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    })

    const text = completion.choices?.[0]?.message?.content ?? "{}"
    console.log("🔥 AI RAW:", text)

    const parsed = JSON.parse(text)
    const messages: string[] = parsed?.messages ?? []

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "AI生成失敗" }, { status: 500 })
    }

    // =========================
    // 🧱 固定プラン（核）
    // =========================
    const basePlan = [
      { day: 0, label: "接点" },
      { day: 7, label: "価値観共有" },
      { day: 14, label: "解釈" },
      { day: 21, label: "再現性" },
      { day: 30, label: "意思決定" },
    ]

    const today = new Date()

    const rows = basePlan.map((p, index) => {
      const due = new Date(today)
      due.setDate(due.getDate() + p.day)

      return {
        account_id: accountId,
        lead_id: leadId,
        company_name: lead.company_name,
        expo_name: lead.expo_name,

        event_id: lead.event_id,

        // 🔥 ここ修正
        task_type: `day${p.day}`,

        action_type: "email",
        due_date: due.toISOString().slice(0, 10),
        is_sent: false,

        notes: messages[index] ?? null,
      }
    })

    // =========================
    // 💾 DB保存
    // =========================
    console.log("🔥 insert rows:", rows) // ←①ここ追加

    const { error: insertError } = await supabase
      .from("follow_tasks")
      .upsert(rows, {
        onConflict: "lead_id,task_type,account_id"
      })

    if (insertError) {
      console.error("🔥 insert error:", insertError) // ←②ここ追加

      return NextResponse.json(
        {
          error: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: rows.length,
      tasks: rows,
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "不明なエラー" },
      { status: 500 }
    )
  }
}

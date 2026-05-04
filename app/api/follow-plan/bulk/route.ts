import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    // 🔽 リクエスト
    const body = await req.json()
    const eventId = body?.eventId

    if (!eventId) {
      return NextResponse.json({ error: "eventId required" }, { status: 400 })
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
      return NextResponse.json({ error: "未認証" }, { status: 401 })
    }

    // 🔥 account_id取得
    const { data: userRow } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .single()

    const accountId = userRow?.account_id

    if (!accountId) {
      return NextResponse.json({ error: "account_idなし" }, { status: 400 })
    }

    // 🔽 リード取得（🔥ここ重要：event_id追加）
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, company_name, event_id") // ← 修正
      .eq("account_id", accountId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // 🎯 フロー（統一）
    const basePlan = [
      { day: 0 },
      { day: 7 },
      { day: 14 },
      { day: 21 },
      { day: 30 },
    ]

    const today = new Date()
    const results: string[] = []

    for (const lead of leads) {
      // 🔥 event_idで絞る（これが正解）
      if (lead.event_id !== eventId) {
        continue
      }

      const rows = basePlan.map(p => {
        const due = new Date(today)
        due.setDate(due.getDate() + p.day)

        return {
          account_id: accountId,
          lead_id: lead.id,
          company_name: lead.company_name,

          event_id: lead.event_id,

          // 🔥 最重要（DBは最小単位）
          task_type: `day${p.day}`,

          action_type: "email",

          due_date: due.toISOString().slice(0, 10),
          is_sent: false,

          notes: null
        }
      })

      const { error: insertError } = await supabase
        .from("follow_tasks")
        .upsert(rows, {
          onConflict: "lead_id,task_type,account_id"
        })

      if (insertError) {
        console.error("insert error:", insertError.message)
        continue
      }

      results.push(`${lead.company_name} (${rows.length}件)`)
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      companies: results,
    })

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "不明なエラー" },
      { status: 500 }
    )
  }
}
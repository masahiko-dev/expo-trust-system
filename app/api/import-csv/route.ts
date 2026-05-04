import { NextRequest, NextResponse } from "next/server"

import * as Papa from "papaparse"
import { getAccountId } from "@/lib/getAccountId"
// import { supabase } from "@/lib/supabase"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
console.log("🔥 import-csv API HIT")

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

  const accountId = await getAccountId()

  const formData = await req.formData()
  const file: any = formData.get("file")

  if (!file) {
    return NextResponse.json({ error: "ファイルなし" }, { status: 400 })
  }

  const text = await file.text()

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  })

  const rows: any[] = parsed.data

// 🔥 account取得
const { data: account } = await supabase
  .from("accounts")
  .select("*")
  .eq("id", accountId)
  .single()

if (!account) {
  return NextResponse.json({ error: "account取得失敗" }, { status: 400 })
}

// 🔥 PoC期限チェック（ここに追加）
const isExpired =
  account.plan_type === "poc" &&
  account.poc_started_at &&
  new Date().getTime() - new Date(account.poc_started_at).getTime() >
    30 * 24 * 60 * 60 * 1000

if (isExpired) {
  return NextResponse.json(
    { error: "PoC期間が終了しています" },
    { status: 400 }
  )
}

type PlanType = "free" | "trial" | "poc" | "standard"
const plan = (account.plan_type ?? "free") as PlanType

const limitMap = {
  free: account.free_limit ?? 0,
  trial: account.trial_limit ?? 3,
  poc: account.poc_limit ?? 100,
  standard: Infinity,
}

const usedMap = {
  free: account.free_used ?? 0,
  trial: account.trial_used ?? 0,
  poc: account.poc_used ?? 0,
  standard: 0,
}

const limit = limitMap[plan]
const used = usedMap[plan]

// 🔥 CSV件数チェック
if (used + rows.length > limit) {
  return NextResponse.json(
    { error: `登録上限に達しています（残り ${limit - used} 件）` },
    { status: 400 }
  )
}

  let count = 0
  let success = 0
  let skipped = 0
  let errorCount = 0

  const eventCache: Record<string, { id: string }> = {}

  for (const row of rows) {
    try {

    // =========================
    // ④ event取得 or 作成（キャッシュ付き）
    // =========================

    const event_name = row.event_name?.trim() || "不明イベント"
    const event_type = row.event_type?.trim() || "other"

    // const key = `${event_name}_${event_type}`
    const key = `${accountId}_${event_type}`


    let event = eventCache[key]

    if (!event) {
      let { data } = await supabase
        .from("events")
        .select("id")
        .eq("account_id", accountId)
        .eq("event_type", event_type)
        .maybeSingle()

      if (!data) {
        const { data: inserted, error } = await supabase
          .from("events")
          .insert({
            event_name,
            event_type,
            account_id: accountId,

            title:
              event_type === "expo"
                ? "展示会接点"
                : event_type === "campaign"
                ? "キャンペーン接点"
                : event_type === "launch"
                ? "サービス接点"
                : "接点",

            description:
              event_type === "expo"
                ? "展示会で接触"
                : event_type === "campaign"
                ? "キャンペーン経由で接触"
                : event_type === "launch"
                ? "サービス接点"
                : "",
          })
          .select()
          .single()

        if (error || !inserted) {
          console.error("event create failed:", error)
          continue
        }

        event = inserted
      } else {
        event = data
      }

      if (!event) {
        skipped++
        continue
      }

      eventCache[key] = event
    }

    // const event = eventCache[key]

      const company_name = row.company_name?.trim()
      if (!company_name) {
        skipped++
        continue
      }

      const department = row.department_name?.trim()
      const position = row.position?.trim()
      const contact_name = row.contact_name?.trim()
      const email = row.email?.trim()

      const conversation_note = row.conversation_note?.trim() || ""
      const pain_point = row.pain_point?.trim() || ""
      const temperature =
        row.temperature === "A" || row.temperature === "B" || row.temperature === "C"
          ? row.temperature
          : "C"

      // =========================
      // ① company取得 or 作成
      // =========================
      let { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("name", company_name)
        .eq("account_id", accountId)
        .maybeSingle()

      if (!company) {
        const { data, error } = await supabase
          .from("companies")
          .insert({
            name: company_name,
            account_id: accountId
          })
          .select()
          .single()

        if (error?.code === "23505") {
          const { data: existing } = await supabase
            .from("companies")
            .select("id")
            .eq("name", company_name)
            .eq("account_id", accountId)
            .single()

          company = existing
        } else if (error || !data) {
          console.error("company insert error:", error)
          continue
        } else {
          company = data
        }
      }

      if (!company) continue

      // =========================
      // ★ lead取得 or 作成（置き換え）
      // =========================
      let { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", company.id)
        .eq("event_id", event.id)      // ★必須
        .eq("department_name", department ?? "")
        .eq("account_id", accountId)
        .maybeSingle()

      if (!lead) {
        const { data, error } = await supabase
          .from("leads")
          .insert({
            company_id: company.id,
            event_id: event.id,
            department_name: department ?? "",
            company_name,
            account_id: accountId,
            temperature,
            contact_name: contact_name ?? "",
            email: email ?? "",
            expo_name: event_name,
          })
          .select()
          .single()

      if (error?.code === "23505") {
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("company_id", company.id)
          .eq("event_id", event.id)
          .eq("department_name", department ?? "")
          .eq("account_id", accountId)
          .single()

        lead = existing
      } else if (error || !data) {
        console.error("lead insert error:", error)
        continue
      } else {
        lead = data
      }
    }
              
      if (!lead) {
        console.error("lead not found")
        continue
      }

      if (lead) {
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            temperature,
            contact_name: contact_name ?? "",
            email: email ?? "",
            expo_name: event_name,
          })
          .eq("id", lead.id)

        if (updateError) {
          console.error("lead update error:", updateError)
          continue
        }
      }

      // =========================
      // ② contact重複防止
      // =========================
      if (email) {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("email", email)
          .eq("company_id", company.id)
          .eq("account_id", accountId)
          .maybeSingle()

        if (!existingContact) {
          const { error } = await supabase
            .from("contacts")
            .insert({
              company_id: company.id,
              lead_id: lead.id,
              name: contact_name,
              department: department ?? "",
              position: position ?? "",
              email,
              account_id: accountId,
              conversation_note,
              pain_point
            })

          if (error) {
            console.error("contact insert error:", error)
            continue
          }
        }
      }

      // =========================
      // ③ follow_tasks重複防止
      // =========================
      const { data: existingTasks } = await supabase
        .from("follow_tasks")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("account_id", accountId)
        .limit(1)

      if (!existingTasks || existingTasks.length === 0) {

        // 🔥 完全に統一
        const tasks = [
          { label: "お礼", day: 0 },
          { label: "価値観共有", day: 7 },
          { label: "解釈", day: 14 },
          { label: "再現性", day: 21 },
          { label: "意思決定", day: 30 },
        ]

        const inserts = []

        for (const t of tasks) {
          const due = new Date()
          due.setDate(due.getDate() + t.day)

          inserts.push({
            lead_id: lead.id,
            
            task_type: `Day${t.day} ${t.label}`,
            action_type: "email",

            due_date: due.toISOString().slice(0, 10),
            is_sent: false,
            
            account_id: accountId,
          })
        }

        // await supabase.from("follow_tasks").insert(inserts)
        const { error: taskError } = await supabase
          .from("follow_tasks")
          .insert(inserts)

        if (taskError) {
          console.error("task insert error:", taskError)
        }
      }

      console.log("count:", count)

      count++
      success++

      } catch (e) {
        errorCount++
        console.error("row error:", e)
        continue
      }
    }

  console.log("rows:", rows.length)

  // 🔥 ここに追加（forループの後！）
  if (plan === "trial") {
    await supabase
      .from("accounts")
      .update({
        trial_used: used + success
      })
      .eq("id", accountId)
  }

  if (plan === "poc") {
    await supabase
      .from("accounts")
      .update({
        poc_used: used + success
      })
      .eq("id", accountId)
  }

  return NextResponse.json({
    count: success,
    total: rows.length,
    success,
    skipped,
    error: errorCount
  })

}
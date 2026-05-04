import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const leadId = searchParams.get("leadId")
    const token = searchParams.get("token") // 🔥追加

    if (!leadId || !token) {
      return NextResponse.json({ error: "invalid params" }, { status: 400 })
    }

    // 🔥 token検証（簡易版でも必須）
    const { data: lead } = await supabase
      .from("leads")
      .select("id, temperature, click_token")
      .eq("id", leadId)
      .single()

    if (!lead || lead.click_token !== token) {
      return NextResponse.json({ error: "invalid token" }, { status: 403 })
    }

    // ① クリックログ
    await supabase.from("click_logs").insert({
      lead_id: leadId,
      clicked_at: new Date().toISOString()
    })

    // ② 温度更新（Aに引き上げ）
    if (lead.temperature !== "A") {
      await supabase
        .from("leads")
        .update({ temperature: "A" })
        .eq("id", leadId)
    }

    // ③ リダイレクト
    return NextResponse.redirect("https://yourlp.com")

  } catch (e) {
    return NextResponse.json({ error: "error" }, { status: 500 })
  }
}
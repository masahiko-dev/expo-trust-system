import OpenAI from "openai"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const runtime = "nodejs"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// テスト用
export async function GET() {
  return Response.json({ ok: "GET works" })
}

export async function POST(req: Request) {
  try {
    const { companyId, url } = await req.json()

    if (!companyId || !url) {
      return Response.json({ error: "invalid params" }, { status: 400 })
    }

    // 🔥 URL最低限チェック（SSRF対策）
    if (!/^https?:\/\//i.test(url)) {
      return Response.json({ error: "invalid url" }, { status: 400 })
    }

    // 🔥 cookie + supabase（統一パターン）
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

    // 🔥 company所有チェック（超重要）
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("account_id", accountId)
      .single()

    if (!company) {
      return Response.json({ error: "不正アクセス" }, { status: 403 })
    }

    // 🔥 外部ページ取得（timeout付き）
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal
    })

    clearTimeout(timeout)

    const html = await res.text()

    // 🔥 HTMLパース
    const cheerio = await import("cheerio")
    const $ = cheerio.load(html)

    $("script, style, noscript").remove()

    const text = $("body").text()
    const cleaned = text.replace(/\s+/g, " ").slice(0, 1500)

    // 🔥 AI生成
    const prompt = `
以下の企業ページから、
営業メールで使える1行を作ってください。

条件：
・具体的な取り組みを1つ
・抽象NG（DXなど禁止）
・そのまま使える日本語

形式：
「〇〇の取り組みをされている点が印象的でした」

テキスト：
${cleaned}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }]
    })

    const line = completion.choices?.[0]?.message?.content ?? ""

    if (!line) {
      return Response.json({ error: "生成失敗" }, { status: 500 })
    }

    // 🔥 DB保存（account縛り）
    await supabase
      .from("companies")
      .update({ website_summary_line: line })
      .eq("id", companyId)
      .eq("account_id", accountId)

    return Response.json({ line })

  } catch (e) {
    console.error("summary error:", e)

    return Response.json({ error: "failed" }, { status: 500 })
  }
}
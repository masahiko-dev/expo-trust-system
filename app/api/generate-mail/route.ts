import OpenAI from "openai"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

type DayType = "day0" |"day7" | "day14" | "day21" | "day30"

type LeadWithCompany = {
  id: string
  event_id: string | null
  brand_id: string | null
  account_id: string
  companies?: {
    name?: string
    website_summary_line?: string
  }
}

  export async function POST(req: Request) {
      try {


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

    const body = await req.json()

    console.log("🔥 body:", body)

    const {
      // companyName,
      day,
      temperature = "B",
      leadId
    } = body

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

    // 🔥 自社プロフィール取得（ここ追加）
    const { data: accountProfile } = await supabase
      .from("account_profiles")
      .select("target, strengths, reasons, achievements")
      .eq("account_id", accountId)
      .maybeSingle()

      // 🔥 プロフィール未入力チェック（ここに入れる）
    if (!accountProfile?.target) {
      return Response.json(
        { error: "プロフィール未入力です" },
        { status: 400 }
      )
    }

    if (!accountId) {
      return Response.json({ error: "account_idなし" }, { status: 500 })
    }

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("conversation_note")
      .eq("lead_id", leadId)
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (contactError) {
      console.error("contact fetch error:", contactError)
    }
    let relationLine = ""

    if (temperature === "A") {
      relationLine = "今回のご縁をきっかけに、今後も何かお役に立てることがあればと思っております。"
    } else {
      relationLine = "今回のご縁をきっかけに、今後も何かあれば一緒に整理できればと思っております。"
    }

    const conversationNote = contact?.conversation_note || ""

    const { data: lead } = await supabase
      .from("leads")
      .select(`
        id,
        event_id,
        brand_id,
        account_id,
        companies (
          name,
          website_summary_line
        )
      `)
      .eq("id", leadId)
      .eq("account_id", accountId)
      .single()

    const l = lead as LeadWithCompany

    const companyName = l?.companies?.name || "ご担当者"
    const summaryLine = l?.companies?.website_summary_line || ""

    let eventType = "expo"

    const eventIdFromBody = body.eventId || lead?.event_id

    console.log("eventIdFromBody:", eventIdFromBody)
    console.log("lead.event_id:", lead?.event_id)

    if (eventIdFromBody) {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("event_type")
        .eq("id", eventIdFromBody)
        .single()

      if (eventError) {
        console.error("event取得エラー:", eventError)
      }

      if (event?.event_type) {
        eventType = event.event_type
      }
    }

    console.log("eventType:", eventType)


    let productName = ""
    let productFeature = ""

    if (lead?.brand_id) {
      const { data: brand } = await supabase
        .from("brands")
        .select("name, feature")
        .eq("id", lead.brand_id)
        .single()

      if (brand) {
        productName = brand.name
        productFeature = brand.feature
      }
    }

    // ✅ ここで定義
    const hasConversation = Boolean(conversationNote?.trim())

    const noteText = hasConversation
      ? `「${conversationNote}」という点について`
      : "ご案内内容について"

    // =======================
    // 🎯 event別設定（ここに集約）
    // =======================
    const eventConfig: Record<string, {
      introHeader: string
      thanksLine: string
      label: string
      instruction: string
    }> = {
      expo: {
        introHeader: "先日は展示会でお話しさせていただき、ありがとうございました。",
        thanksLine: "本日は展示会にて弊社ブースへお立ち寄りいただき、ありがとうございます。",
        label: "展示会",
        instruction: "今回は展示会後フォローとして、短い接点を補完し、印象に残る丁寧な文章にしてください。"
      },
      campaign: {
        introHeader: "先日はキャンペーンにご関心いただき、ありがとうございました。",
        thanksLine: "この度はキャンペーンにご関心をお寄せいただき、ありがとうございます。",
        label: "キャンペーン",
        instruction: "今回はキャンペーン経由の接点のため、相手がすでに一定の興味を持っている前提で、次の行動（検討・問い合わせ・申込み）を自然に促す文章にしてください。"
      },
      webinar: {
        introHeader: "先日はウェビナーにご参加いただき、ありがとうございました。",
        thanksLine: "この度はウェビナーにご参加いただき、ありがとうございます。",
        label: "ウェビナー",
        instruction: "今回はウェビナー参加後のフォローとして、内容の振り返りと気づきをベースに、自然に次の会話へつなげる文章にしてください。"
      },
      launch: {
        introHeader: "先日は新製品発表にご関心いただき、ありがとうございました。",
        thanksLine: "この度は新製品発表にご関心をお寄せいただき、ありがとうございます。",
        label: "新製品発表",
        instruction: "今回は新製品発表後のフォローとして、製品の特徴や価値を補足しながら、興味を深める文章にしてください。"
      }
    }

    // =======================
    // 🔥 fallback含めて取得
    // =======================
    const config = eventConfig[eventType] || {
      introHeader: "先日はお時間をいただき、ありがとうございました。",
      thanksLine: "この度はお時間をいただき、ありがとうございます。",
      label: "今回の機会",
      instruction: "今回の接点を踏まえ、自然なフォロー文章を作成してください。"
    }

    const introHeader = config.introHeader
    const thanksLine = config.thanksLine
    const eventLabel = config.label
    const eventInstruction = config.instruction

    // =======================
    // 以下は既存ロジックでOK
    // =======================
    let prompt = ""
    let subject = ""
    let intro = ""
    let closing = ""

    // 🔥 プロフィールブロック
    const profileBlock = `
    【自社プロフィール】
    ターゲット：
    ${accountProfile?.target ?? "未設定"}

    強み：
    ${(accountProfile?.strengths ?? []).filter(Boolean).join("\n")}

    選ばれた理由：
    ${(accountProfile?.reasons ?? []).filter(Boolean).join("\n")}

    成果：
    ${(accountProfile?.achievements ?? []).filter(Boolean).join("\n")}

    上記を前提に、相手に刺さる営業文章にしてください。
    `


    if (day === "day0") {

    console.log("eventType:", eventType)

    const mail = hasConversation
        ? `
    件名：本日はありがとうございました

    ${companyName} 様

    ${introHeader}

    短いお時間ではありましたが、
    「${conversationNote}」という点についてお話しいただき、
    とても印象に残っております。

    今回のご縁をきっかけに、
    今後も何かあれば気軽にご相談いただければと思っております。

    まずはお礼までとなりますが、
    引き続きよろしくお願いいたします。
    `.trim()

        : `
    件名：本日はありがとうございました

    ${companyName} 様

    ${thanksLine}

    当日ご案内させていただいた内容について、
    何かご不明点などございましたらお気軽にお知らせください。

    まずはお礼までとなりますが、
    引き続きよろしくお願いいたします。
    `.trim()

      return Response.json({ mail })
    }

      // 🔥 Day7（共感・弱め）
      if (day === "day7") {
      prompt = `
      ${profileBlock}

      以下の条件で文章を書いてください。

      ${eventInstruction}

      【制約】
      ・3〜4文で書くこと
      ${hasConversation ? `${eventLabel}でお話しされていた「${conversationNote}」という点を踏まえ、` : ""}
      ・「少し考えてみていたのですが」など柔らかく入る
      ・断定しない（〜かもしれません、〜と感じました）
      ・原因分析は書かない（決めつけ禁止）
      ・「整理すると変わるかも」という余白で終える
      ・最後は「一緒に整理できれば」で締める

      ※一般論は禁止、必ず相手の状況として書く
      `

      subject = conversationNote?.trim()
        ? `${conversationNote}について少し考えてみたのですが`
        : `${eventLabel}での内容について少し考えてみたのですが`

      intro = hasConversation
        ? `${eventLabel}でのお話を踏まえて、少し考えてみていたのですが、`
        : `${eventLabel}での内容について、少し考えてみていたのですが、`

      closing = "一度整理してみると、また違った見え方になるかもしれません。"
  }

    // 🔥 Day14（事例）
    if (day === "day14") {
      prompt = `
      ${profileBlock}

      以下の条件で文章を書いてください。

      ${eventInstruction}

      【制約】
      ・3〜4文で書くこと
      ${hasConversation ? `${eventLabel}でお話しされていた「${conversationNote}」という点を踏まえ、` : ""}

      ・必ず「他社の事例」として書く（相手の話にしない）
      ・「似たケースとして〜」から始める
      ・最初はうまくいかなかった状態を書く
      ・どこで止まっていたかを書く
      ・整理した結果どう変わったかを書く
      ・最後に「進め方で変わる」という示唆で終える

      自然な文章で書いてください。
      `
      subject = conversationNote?.trim()
        ? `${conversationNote}について（事例）`
        : `${eventLabel}でのご案内内容について`
      intro = `${eventLabel}での内容を踏まえ、補足させていただきます。`
      closing = "進め方次第で結果は大きく変わる領域かと思います。"
    }

    // 🔥 Day21（判断）
    if (day === "day21") {
      prompt = `
      ${profileBlock}
      以下の条件で文章を書いてください。

      ${eventInstruction}

      【制約】
      ・3〜4文で書くこと
      ${hasConversation ? `${eventLabel}でお話しされていた「${conversationNote}」という点を踏まえ、` : ""}

      ・「導入や検討の判断」で迷うポイントを書く（展示会参加ではない）
      ・現在の検討状況として書く
      ・なぜ判断できないのか原因を書く（運用イメージ不足など）
      ・一度整理すると判断しやすくなる流れにする

      ※必ず来場者側（導入検討者）の視点で書く
      `
    
    subject = conversationNote?.trim()
      ? `${conversationNote}について（進め方の考え方）`
      : `${eventLabel}でのご案内内容について`
      intro = "ここまでを踏まえ、判断の観点で整理させていただきます。"
      closing = "このあたりが整理できると、進めるかどうかの判断もしやすくなるかと思います。"
    }

    // 🔥 Day30（決断）
    if (day === "day30") {
      prompt = `
      ${profileBlock}
      以下の条件で文章を書いてください。

      ${eventInstruction}

      【制約】
      ・2〜4文で書くこと
      ${hasConversation ? `${eventLabel}でお話しされていた「${conversationNote}」という点を踏まえ、` : ""}
      ・今の状態で止まっている理由
      ・一度整理すると進みやすくなるケースが多いこと
      ・短時間の会話で整理できる内容であること

      を自然な文章で2〜3文で書いてください。
      `
      // 🔥 ここ追加
      if (temperature === "B") {
        prompt += `
    ・自然に次のアクション（会話）につながる流れにする
    `
      }

      subject = `一度お話しできればと思いご連絡しました`
      intro = "一度整理してもよいタイミングかと思いご連絡しました。"
      closing = "30分ほどでも構いませんので、状況の整理だけでもお話しできればと思います。"
    }

    // 🔥 温度分岐（ここに入れる）
    if (temperature === "A") {
      prompt += `
    ・要点だけ短く書く
    ・結論を先に書く
    `
      closing = "短時間で整理できると思いますので、ご都合よろしければお話しできれば幸いです。"
    }

    if (temperature === "C") {
      prompt += `
    ・丁寧に説明する
    ・相手の不安に寄り添う
    `
      closing = "無理に進める必要はございませんので、気になる点があればお気軽にご相談ください。"
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
          あなたはBtoB営業の専門家です。

          【重要】
          ・挨拶文（◯◯様）は書かない
          ・件名は書かない
          ・署名は書かない
          ・本文だけを書く

          接点（${eventType}）とフォロータイミング（${day}）を踏まえて、
          自然なフォローメール文を作成してください。

          【前提】
          ・接点は展示会・キャンペーン・ウェビナーなど様々
          ・それぞれに応じた自然な導入・文脈にする

          【ルール】
          ・相手の状況として書く（一般論禁止）
          ・言い切りすぎない（推測は「〜と感じました」を使う）
          ・会話内容を広げすぎない
          ・具体と抽象のバランスを取る
          ・営業っぽくせず自然に書く
          `
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    })

    const aiPart =
      completion.choices?.[0]?.message?.content ?? ""

    const cleanedAiPart = aiPart
      .replace(/^件名：.*$/gm, "")
      .replace(/.*様\n/g, "")
      .trim()
  
    // 🔥 共通テンプレ
    const mail = `
    件名：${subject}

    ${companyName} 様

    ${introHeader}

    ${summaryLine ? `${summaryLine}\n` : ""}

    ${intro}

    ${cleanedAiPart}

    ${productName ? `${productName}では、${productFeature}に関してもご一緒に整理することが可能です。\n` : ""}

    無理に進める必要はないと思いますが、
    ${closing}

    状況に応じて補足できることもありますので、
    必要でしたらお知らせください。
    `.trim()

    return Response.json({ mail })

  } catch (error) {
    console.error("API ERROR:", error)

    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
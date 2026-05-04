export type BuildDay7Input = {
  companyName: string
  conversationNote?: string
  productInfo?: string
}

export type BuildDay7Output = {
  companyName: string
  conversationNote: string
  productInfo: string
  productBlock: string
}

export function buildDay7(input: BuildDay7Input): BuildDay7Output {

  const conversationNote = input.conversationNote ?? ""
  const productInfo = input.productInfo ?? ""

  const productBlock = productInfo
    ? [
        "当日お話しさせていただいたように、",
        "",
        "「導入したいが難しい」というお話は、",
        "多くの企業様が同じところで止まっています。",
        "",
        "例えば実際には、",
        "",
        "・初期設定にどこまで手をかけるべきか分からない",
        "・現場で本当に使われるのかイメージが持てない",
        "・運用が属人化してしまうのではないか不安",
        "",
        "といったポイントで、",
        "検討が止まってしまうケースが少なくありません。",
        "",
        "そのため弊社では、",
        "",
        productInfo,
        "",
        "といった形で、",
        "“現場で実際に回る状態”まで落とし込むことを重視しています。"
      ].join("\n")
    : ""

  return {
    companyName: input.companyName,
    conversationNote,
    productInfo,
    productBlock
  }
}
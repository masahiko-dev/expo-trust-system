export default function LegalPage() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "60px 20px",
        lineHeight: 1.9,
      }}
    >
      <h1
        style={{
          fontSize: 32,
          marginBottom: 10,
        }}
      >
        特定商取引法に基づく表記
      </h1>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 40,
        }}
      >
        <tbody>
          <tr>
            <th style={thStyle}>販売事業者名</th>
            <td style={tdStyle}>株式会社45.r</td>
          </tr>

          <tr>
            <th style={thStyle}>運営責任者</th>
            <td style={tdStyle}>山田 雅彦</td>
          </tr>

          <tr>
            <th style={thStyle}>所在地</th>
            <td style={tdStyle}>
              ※請求があった場合、遅滞なく開示いたします。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>メールアドレス</th>
            <td style={tdStyle}>
              ※お問い合わせは下記Webサイトよりお願いいたします。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>Webサイト</th>
            <td style={tdStyle}>
              <a
                href="https://expofollow.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://expofollow.com
              </a>
            </td>
          </tr>

          <tr>
            <th style={thStyle}>販売価格</th>
            <td style={tdStyle}>
              各サービスページに記載しております。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>商品代金以外の必要料金</th>
            <td style={tdStyle}>
              インターネット接続料金、通信料金等は利用者負担となります。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>支払方法</th>
            <td style={tdStyle}>
              クレジットカード決済、その他当社が定める方法
            </td>
          </tr>

          <tr>
            <th style={thStyle}>支払時期</th>
            <td style={tdStyle}>
              申込時または契約更新時に決済されます。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>サービス提供時期</th>
            <td style={tdStyle}>
              決済完了後、利用可能となります。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>キャンセル・解約について</th>
            <td style={tdStyle}>
              利用者は、当社所定の方法により解約手続きを行うことができます。
              <br />
              なお、支払済み料金については、法令上必要な場合を除き返金いたしません。
            </td>
          </tr>

          <tr>
            <th style={thStyle}>動作環境</th>
            <td style={tdStyle}>
              最新版の主要ブラウザ環境を推奨しております。
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  )
}

const thStyle = {
  width: "30%",
  textAlign: "left" as const,
  verticalAlign: "top" as const,
  padding: "16px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 600,
}

const tdStyle = {
  padding: "16px",
  borderBottom: "1px solid #e5e7eb",
}
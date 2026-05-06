export default function PrivacyPage() {
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
        プライバシーポリシー（ExpoFollow）
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: 40,
        }}
      >
        最終更新日：2026年5月6日
      </p>

      <p>
        株式会社45.r（以下、「当社」といいます。）は、当社が提供する「ExpoFollow」（以下、「本サービス」といいます。）における利用者情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
      </p>

      <h2 style={{ marginTop: 40 }}>1. 取得する情報</h2>

      <p>
        当社は、本サービスにおいて以下の情報を取得する場合があります。
      </p>

      <h3 style={{ marginTop: 24 }}>（1）アカウント情報</h3>

      <ul style={{ paddingLeft: 24 }}>
        <li>氏名</li>
        <li>メールアドレス</li>
        <li>ログイン情報</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>（2）営業関連情報</h3>

      <p>利用者が本サービスへ登録した以下の情報</p>

      <ul style={{ paddingLeft: 24 }}>
        <li>会社名</li>
        <li>担当者名</li>
        <li>部署名</li>
        <li>メールアドレス</li>
        <li>展示会・イベント情報</li>
        <li>会話内容</li>
        <li>営業メモ</li>
        <li>温度感情報</li>
        <li>その他利用者が登録した情報</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>（3）利用情報</h3>

      <ul style={{ paddingLeft: 24 }}>
        <li>アクセス情報</li>
        <li>IPアドレス</li>
        <li>Cookie</li>
        <li>ブラウザ情報</li>
        <li>操作履歴</li>
        <li>ログ情報</li>
      </ul>

      <h2 style={{ marginTop: 40 }}>2. 利用目的</h2>

      <p>当社は、取得した情報を以下の目的で利用します。</p>

      <ul style={{ paddingLeft: 24 }}>
        <li>本サービスの提供・運営</li>
        <li>ログイン認証</li>
        <li>AI文章生成</li>
        <li>営業支援機能の提供</li>
        <li>サービス改善</li>
        <li>不正利用防止</li>
        <li>お問い合わせ対応</li>
        <li>新機能・更新情報の案内</li>
        <li>障害対応</li>
        <li>統計分析</li>
      </ul>

      <h2 style={{ marginTop: 40 }}>3. AI機能について</h2>

      <p>
        本サービスでは、AIによる文章生成機能を提供しています。
      </p>

      <p>
        利用者が入力した情報は、AI機能の提供・改善のために利用される場合があります。
      </p>

      <h2 style={{ marginTop: 40 }}>4. 第三者提供</h2>

      <p>
        当社は、以下の場合を除き、取得した情報を第三者へ提供しません。
      </p>

      <ul style={{ paddingLeft: 24 }}>
        <li>利用者本人の同意がある場合</li>
        <li>法令に基づく場合</li>
        <li>人の生命・身体・財産保護のため必要な場合</li>
        <li>業務委託先に必要範囲で提供する場合</li>
      </ul>

      <h2 style={{ marginTop: 40 }}>5. 外部サービスの利用</h2>

      <p>
        本サービスでは、以下の外部サービスを利用する場合があります。
      </p>

      <ul style={{ paddingLeft: 24 }}>
        <li>Supabase</li>
        <li>OpenAI</li>
        <li>Stripe</li>
        <li>Google関連サービス</li>
        <li>その他業務上必要な外部サービス</li>
      </ul>

      <p>
        利用者は、これら外部サービスの利用に伴い、各サービス提供事業者のポリシーが適用される場合があります。
      </p>

      <h2 style={{ marginTop: 40 }}>6. Cookie等について</h2>

      <p>
        本サービスでは、ログイン認証や利便性向上のためCookie等を利用する場合があります。
      </p>

      <p>
        利用者はブラウザ設定によりCookieを無効化できますが、一部機能が利用できなくなる場合があります。
      </p>

      <h2 style={{ marginTop: 40 }}>7. データ管理</h2>

      <p>
        当社は、取得した情報について、不正アクセス・漏えい・改ざん等を防止するため、合理的な安全管理措置を講じます。
      </p>

      <h2 style={{ marginTop: 40 }}>8. 保存期間</h2>

      <p>
        当社は、利用目的達成に必要な期間、利用者情報を保持します。
      </p>

      <h2 style={{ marginTop: 40 }}>9. 利用者の権利</h2>

      <p>
        利用者は、当社に対して自己情報の開示、訂正、削除等を求めることができます。
      </p>

      <h2 style={{ marginTop: 40 }}>10. ポリシー変更</h2>

      <p>
        当社は、必要に応じて本ポリシーを変更する場合があります。
      </p>

      <h2 style={{ marginTop: 40 }}>11. お問い合わせ</h2>

      <p>
        本ポリシーに関するお問い合わせは、以下までお願いいたします。
      </p>

      <p>
        株式会社45.r
        <br />
        ExpoFollow
        <br />
        <a
          href="https://expofollow.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://expofollow.com
        </a>
      </p>
    </main>
  )
}
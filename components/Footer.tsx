import Link from "next/link"

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        padding: "24px 20px",
        borderTop: "1px solid #e5e7eb",
        fontSize: 14,
        color: "#666",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* 左側 */}
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <Link href="/terms">
            利用規約
          </Link>

          <Link href="/privacy">
            プライバシーポリシー
          </Link>

          <Link href="/legal">
            特定商取引法
          </Link>

          <a
            href="https://forms.gle/PJTNrYdSbdSCHizt5"
            target="_blank"
            rel="noopener noreferrer"
          >
            お問い合わせ
          </a>
        </div>

        {/* 右側 */}
        <div>
          © 2026 ExpoFollow / 45.r
        </div>
      </div>
    </footer>
  )
}
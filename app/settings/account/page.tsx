export default function AccountPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>マイアカウント</h1>
      <p>プロフィールはこちらで編集できます</p>

        <a
        href="/profile"
        style={{
            display: "inline-block",
            marginTop: 16,
            background: "#4f46e5",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none"
        }}
        >
        プロフィールを編集する
        </a>

        <a
          href="https://forms.gle/PJTNrYdSbdSCHizt5"
          style={{
            display: "block",
            color: "#4f46e5",
            textDecoration: "underline",
            fontWeight: 500,
            marginTop:30,
          }}
        >
          サポートに問い合わせる
        </a>

    </div>
  )

}
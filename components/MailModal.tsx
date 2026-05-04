import { useEffect, useState } from "react"

type Props = {
  open: boolean
  mail: string
  setMail: (v: string) => void
  onClose: () => void
  onSave: () => void
  saving?: boolean
}

export default function MailModal({
  open,
  mail,
  setMail,
  onClose,
  onSave,
  saving
}: Props) {

    const [copied, setCopied] = useState(false)

    useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    }, [open, onClose])

  return (
    <div 
        onClick={onClose}
        style={{
        position:"fixed",
        top:0,left:0,right:0,bottom:0,
        background:"rgba(0,0,0,0.4)",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        zIndex:100
    }}>
      <div 
        onClick={(e)=>e.stopPropagation()}
        style={{
            background:"white",
            padding:30,
            borderRadius:10,
            width:600
      }}>
        <h2>AIフォローメール</h2>

        <textarea
          value={mail}
          onChange={(e)=>setMail(e.target.value)}
          style={{
            width:"100%",
            height:200,
            marginTop:10
          }}
        />

        <div style={{marginTop:20, display:"flex", gap:10}}>
            <button
            onClick={()=>{
                navigator.clipboard.writeText(mail)
                setCopied(true)
                setTimeout(()=>setCopied(false),1000)
            }}
            style={{
                background:"#e5e7eb",
                border:"none",
                padding:"8px 14px",
                borderRadius:6
            }}
            >
            {copied ? "コピー済み" : "コピー"}
            </button>

          <button
            onClick={onClose}
            style={{
              background:"#f3f4f6",
              border:"none",
              padding:"8px 14px",
              borderRadius:6
            }}
          >
            閉じる
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: saving ? "#9ca3af" : "#10b981",
              color:"white",
              border:"none",
              padding:"8px 14px",
              borderRadius:6
            }}
          >
            {saving ? "保存中..." : "履歴に保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
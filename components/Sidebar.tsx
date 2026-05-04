"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {

  const pathname = usePathname()

  const getClass = (path: string) => {
    return `
      block px-3 py-2 rounded transition-all duration-200
      ${pathname.startsWith(path)
        ? "bg-gray-300 font-semibold"
        : "hover:bg-gray-200 hover:pl-4"}
    `
  }

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-200 p-6">

      <h1 className="text-xl font-semibold mb-8 text-gray-800">
        ExpoFollow
      </h1>

      <nav className="space-y-2 text-gray-700">

        <Link href="/dashboard" className={getClass("/dashboard")}>
          🔥 Dashboard
        </Link>

      <Link href="/companies" className={getClass("/companies")}>
        📋 Leads
      </Link>

        <Link href="/import" className={getClass("/import")}>
          📥 CSV Import
        </Link>

        <Link href="/settings/account" className={getClass("/settings")}>
          ⚙ Settings
        </Link>

      </nav>
    </aside>
  )
}
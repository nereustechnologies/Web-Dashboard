import type React from "react"
import { MainNav } from "@/components/main-nav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav role="admin" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

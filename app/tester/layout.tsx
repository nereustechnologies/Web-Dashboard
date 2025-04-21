import type React from "react"
import { MainNav } from "@/components/main-nav"

export default function TesterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav role="tester" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

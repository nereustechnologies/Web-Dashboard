import { NextResponse } from "next/server"

export async function POST() {
  try {
    // No need to do anything server-side, client will handle logout
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

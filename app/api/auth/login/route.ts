import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Simple password hashing function for demo purposes
    const hashPassword = (password: string) => {
      return createHash("sha256").update(password).digest("hex")
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid login credentials" }, { status: 401 })
    }

    // Compare passwords
    const hashedPassword = hashPassword(password)
    if (hashedPassword !== user.password) {
      return NextResponse.json({ error: "Invalid login credentials" }, { status: 401 })
    }

    // Set session cookie
    cookies().set("session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    // Set user role cookie for client-side access
    cookies().set("userRole", user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

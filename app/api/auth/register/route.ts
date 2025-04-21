import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json()

    // Validate role
    if (role !== "admin" && role !== "tester") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Simple password hashing function for demo purposes
    const hashPassword = (password: string) => {
      return createHash("sha256").update(password).digest("hex")
    }

    // Hash password
    const hashedPassword = hashPassword(password)

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

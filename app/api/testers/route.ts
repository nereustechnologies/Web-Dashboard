import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"

export async function POST(request: Request) {
  try {
    const { name, email, password, adminId } = await request.json()

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
    const tester = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "tester",
        adminId,
      },
    })

    return NextResponse.json({
      id: tester.id,
      email: tester.email,
      name: tester.name,
      role: tester.role,
    })
  } catch (error) {
    console.error("Error creating tester:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get("adminId")

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID is required" }, { status: 400 })
    }

    const testers = await prisma.user.findMany({
      where: {
        role: "tester",
        adminId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(testers)
  } catch (error) {
    console.error("Error fetching testers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

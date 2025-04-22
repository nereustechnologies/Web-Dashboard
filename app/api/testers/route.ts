import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { supabase } from "@/lib/supabaseClient"

// Update the POST method in the testers route to use Supabase Auth
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: "tester",
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Create user in database
    const tester = await prisma.user.create({
      data: {
        id: authData.user.id,
        name,
        email,
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

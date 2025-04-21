import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tester = await prisma.user.findUnique({
      where: {
        id: params.id,
        role: "tester",
      },
      include: {
        tests: {
          include: {
            customer: true,
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    })

    if (!tester) {
      return NextResponse.json({ error: "Tester not found" }, { status: 404 })
    }

    return NextResponse.json(tester)
  } catch (error) {
    console.error("Error fetching tester:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { name, email } = await request.json()

    const tester = await prisma.user.update({
      where: {
        id: params.id,
        role: "tester",
      },
      data: {
        name,
        email,
      },
    })

    return NextResponse.json(tester)
  } catch (error) {
    console.error("Error updating tester:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const tester = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true },
    })

    if (!tester) {
      return NextResponse.json({ error: "Tester not found" }, { status: 404 })
    }

    // Delete user from Supabase
    const { error: authError } = await supabase.auth.admin.deleteUser(tester.email)

    if (authError) {
      console.error("Error deleting user from Supabase:", authError)
    }

    // Delete all related tests first
    await prisma.test.deleteMany({
      where: { testerId: params.id },
    })

    // Delete the tester
    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tester:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

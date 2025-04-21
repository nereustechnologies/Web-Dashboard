import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            include: {
                tests: true,
            },
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error("Error fetching user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const { name, email, password, role } = await request.json()

        const data: any = {
            name,
            email,
            role,
        }

        // Simple password hashing function for demo purposes
        const hashPassword = (password: string) => {
            return createHash("sha256").update(password).digest("hex")
        }

        // Only update password if provided
        if (password) {
            data.password = hashPassword(password)
        }

        const user = await prisma.user.update({
            where: { id: params.id },
            data,
        })

        return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        })
    } catch (error) {
        console.error("Error updating user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        // Delete all related tests first
        await prisma.test.deleteMany({
            where: { testerId: params.id },
        })

        // Delete the user
        await prisma.user.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

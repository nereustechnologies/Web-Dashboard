import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"

// This is a development-only route to seed the database with initial users
export async function POST() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not available in production" }, { status: 403 })
    }

    try {
        // Simple password hashing function for demo purposes
        const hashPassword = (password: string) => {
            return createHash("sha256").update(password).digest("hex")
        }

        // Check if admin already exists
        const adminExists = await prisma.user.findUnique({
            where: { email: "admin@nereus.com" },
        })

        if (!adminExists) {
            // Create admin user
            const adminPassword = hashPassword("admin123")
            await prisma.user.create({
                data: {
                    name: "Admin User",
                    email: "admin@nereus.com",
                    password: adminPassword,
                    role: "admin",
                },
            })
        }

        // Check if tester already exists
        const testerExists = await prisma.user.findUnique({
            where: { email: "tester@nereus.com" },
        })

        if (!testerExists) {
            // Get admin ID
            const admin = await prisma.user.findUnique({
                where: { email: "admin@nereus.com" },
            })

            if (admin) {
                // Create tester user
                const testerPassword = hashPassword("tester123")
                await prisma.user.create({
                    data: {
                        name: "Tester User",
                        email: "tester@nereus.com",
                        password: testerPassword,
                        role: "tester",
                        adminId: admin.id,
                    },
                })
            }
        }

        return NextResponse.json({ success: true, message: "Database seeded successfully" })
    } catch (error) {
        console.error("Seed error:", error)
        return NextResponse.json({ error: "Failed to seed database" }, { status: 500 })
    }
}

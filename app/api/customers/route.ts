import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Make sure the data matches the schema
    const customerData = {
      name: data.name,
      email: data.email || `${data.name.toLowerCase().replace(/\s+/g, ".")}@example.com`, // Generate email if not provided
      age: data.age,
      gender: data.gender,
      height: data.height,
      weight: data.weight,
    }

    const customer = await prisma.customer.create({
      data: customerData,
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    const where = search
        ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
        : {}

    const customers = await prisma.customer.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { IMUClient } from "@/lib/imu-client"

export async function POST(request: Request) {
  try {
    const { customerId, testerId, exercises } = await request.json()

    // Create a new test in the database
    const test = await prisma.test.create({
      data: {
        status: "In Progress",
        customerId,
        testerId,
        exercises: {
          create: exercises.map((exercise: any) => ({
            name: exercise.name,
            category: exercise.category,
            completed: false,
          })),
        },
      },
      include: {
        exercises: true,
      },
    })

    // Start the test in the IMU service
    await IMUClient.startTest({
      testId: test.id,
      userId: customerId,
      testerId,
      exerciseType: "mobility",
      exerciseName: exercises[0].name,
    })

    return NextResponse.json(test)
  } catch (error) {
    console.error("Error creating test:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testerId = searchParams.get("testerId")
    const customerId = searchParams.get("customerId")

    const where: any = {}
    if (testerId) where.testerId = testerId
    if (customerId) where.customerId = customerId

    const tests = await prisma.test.findMany({
      where,
      include: {
        customer: true,
        tester: true,
        exercises: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(tests)
  } catch (error) {
    console.error("Error fetching tests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

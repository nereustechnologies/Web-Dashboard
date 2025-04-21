import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { IMUClient } from "@/lib/imu-client"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { exerciseType, exerciseName } = await request.json()
    const testId = params.id

    // Get the test to get user and tester IDs
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { customer: true },
    })

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    // Create a new exercise in the database
    const exercise = await prisma.exercise.create({
      data: {
        name: exerciseName,
        category: exerciseType,
        testId,
      },
    })

    // End the current exercise and start a new one in the IMU service
    await IMUClient.endExercise({
      testId,
      userId: test.customerId,
      testerId: test.testerId,
      exerciseType,
      exerciseName,
    })

    return NextResponse.json(exercise)
  } catch (error) {
    console.error("Error creating exercise:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

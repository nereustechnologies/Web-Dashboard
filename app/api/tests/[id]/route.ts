import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { IMUClient } from "@/lib/imu-client"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        tester: true,
        exercises: true,
      },
    })

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    return NextResponse.json(test)
  } catch (error) {
    console.error("Error fetching test:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status, exerciseId, completed } = await request.json()

    // Update test status
    const test = await prisma.test.update({
      where: { id: params.id },
      data: { status },
      include: {
        exercises: true,
        customer: true,
      },
    })

    // If an exercise is being updated
    if (exerciseId) {
      await prisma.exercise.update({
        where: { id: exerciseId },
        data: { completed },
      })
    }

    // If the test is being completed, end it in the IMU service
    if (status === "Completed") {
      await IMUClient.endTest(params.id)
    }

    return NextResponse.json(test)
  } catch (error) {
    console.error("Error updating test:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Delete all related exercises first
    await prisma.exercise.deleteMany({
      where: { testId: params.id },
    })

    // Delete the test
    await prisma.test.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting test:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

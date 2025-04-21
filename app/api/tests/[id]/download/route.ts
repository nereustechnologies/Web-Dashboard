import { NextResponse } from "next/server"
import { IMUClient } from "@/lib/imu-client"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const testId = params.id

    // Get download URL from IMU service
    const { download_url } = await IMUClient.getDownloadUrl(testId)

    // In a real app, you would serve the file directly or generate a signed URL
    // For this example, we'll just return the URL
    return NextResponse.json({ download_url })
  } catch (error) {
    console.error("Error getting download URL:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// This would be a separate API route to actually serve the file
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const testId = params.id
    const zipPath = path.join(process.cwd(), "data", testId, "test_data.zip")

    // Check if the file exists
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Get test info
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { customer: true },
    })

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    // Create a record of the download
    await prisma.zipFile.create({
      data: {
        id: testId,
        filename: `test_data_${testId}.zip`,
        filePath: zipPath,
        testerId: test.testerId,
        customerId: test.customerId,
      },
    })

    // In a real app, you would stream the file or redirect to a signed URL
    return NextResponse.json({ success: true, download_ready: true })
  } catch (error) {
    console.error("Error preparing download:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

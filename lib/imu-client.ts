// Client for interacting with the IMU service backend

export interface SensorData {
  accX: number
  accY: number
  accZ: number
  gyrX: number
  gyrY: number
  gyrZ: number
  timestamp: string
}

export interface ScanResult {
  address: string
  name: string
}

export interface TestInfo {
  testId: string
  userId: string
  testerId: string
  exerciseType: string
  exerciseName: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_IMU_API_URL || "http://localhost:8000"

export const IMUClient = {
  async scanDevices(): Promise<ScanResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/scan`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to scan for devices")
      }
      return await response.json()
    } catch (error) {
      console.error("Error scanning for devices:", error)
      throw error
    }
  },

  async connectDevice(address: string): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/connect/${address}`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to connect to device")
      }
      return await response.json()
    } catch (error) {
      console.error("Error connecting to device:", error)
      throw error
    }
  },

  async disconnectDevice(address: string): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/disconnect/${address}`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to disconnect from device")
      }
      return await response.json()
    } catch (error) {
      console.error("Error disconnecting from device:", error)
      throw error
    }
  },

  async startTest(testInfo: TestInfo): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/start-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testInfo),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to start test")
      }
      return await response.json()
    } catch (error) {
      console.error("Error starting test:", error)
      throw error
    }
  },

  async endExercise(testInfo: TestInfo): Promise<{ status: string; message: string; exercise_key: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/end-exercise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testInfo),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to end exercise")
      }
      return await response.json()
    } catch (error) {
      console.error("Error ending exercise:", error)
      throw error
    }
  },

  async endTest(testId: string): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/end-test/${testId}`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to end test")
      }
      return await response.json()
    } catch (error) {
      console.error("Error ending test:", error)
      throw error
    }
  },

  async getDownloadUrl(testId: string): Promise<{ download_url: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/download/${testId}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to get download URL")
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting download URL:", error)
      throw error
    }
  },
}

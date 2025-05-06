// Client for interacting with the IMU sensor and Supabase

import { supabase } from "@/lib/supabase"

export interface SensorData {
  accX: number
  accY: number
  accZ: number
  gyrX: number
  gyrY: number
  gyrZ: number
  timestamp: string
}

export interface TestInfo {
  testId: string
  userId: string
  testerId: string
  exerciseType: string
  exerciseName: string
}

// Define the service and characteristic UUIDs for the IMU sensor
const IMU_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
const IMU_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

class IMUClientService {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private dataListeners: ((data: SensorData) => void)[] = []
  private isConnected = false
  private testId: string | null = null
  private exerciseType: string | null = null
  private exerciseName: string | null = null
  private dataBuffer: SensorData[] = []
  private bufferInterval: NodeJS.Timeout | null = null

  // Connect to a Bluetooth device
  async connectDevice(device: BluetoothDevice): Promise<boolean> {
    try {
      this.device = device

      // Connect to the GATT server
      const server = await device.gatt?.connect()
      if (!server) {
        throw new Error("Failed to connect to GATT server")
      }

      // Get the IMU service
      const service = await server.getPrimaryService(IMU_SERVICE_UUID)

      // Get the IMU characteristic
      this.characteristic = await service.getCharacteristic(IMU_CHARACTERISTIC_UUID)

      // Start notifications
      await this.characteristic.startNotifications()

      // Add event listener for characteristic value changes
      this.characteristic.addEventListener("characteristicvaluechanged", this.handleDataReceived.bind(this))

      this.isConnected = true

      // Start buffer flush interval
      this.startBufferFlush()

      return true
    } catch (error) {
      console.error("Error connecting to device:", error)
      this.isConnected = false
      return false
    }
  }

  // Disconnect from the device
  async disconnectDevice(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      if (this.characteristic) {
        try {
          await this.characteristic.stopNotifications()
          this.characteristic.removeEventListener("characteristicvaluechanged", this.handleDataReceived.bind(this))
        } catch (error) {
          console.error("Error stopping notifications:", error)
        }
      }

      try {
        this.device.gatt.disconnect()
      } catch (error) {
        console.error("Error disconnecting device:", error)
      }
    }

    this.isConnected = false
    this.device = null
    this.characteristic = null

    // Stop buffer flush interval
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval)
      this.bufferInterval = null
    }

    // Flush any remaining data
    await this.flushBuffer()
  }

  // Handle data received from the device
  private handleDataReceived(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value

    if (!value) return

    try {
      // Parse the data based on your IMU sensor's data format
      // This is an example and should be adjusted to match your sensor's data format
      const dataView = value.buffer ? new DataView(value.buffer) : new DataView(new ArrayBuffer(0))

      const sensorData: SensorData = {
        accX: dataView.getFloat32(0, true),
        accY: dataView.getFloat32(4, true),
        accZ: dataView.getFloat32(8, true),
        gyrX: dataView.getFloat32(12, true),
        gyrY: dataView.getFloat32(16, true),
        gyrZ: dataView.getFloat32(20, true),
        timestamp: new Date().toISOString(),
      }

      // Add to buffer
      this.dataBuffer.push(sensorData)

      // Notify listeners
      this.dataListeners.forEach((listener) => listener(sensorData))
    } catch (error) {
      console.error("Error parsing IMU data:", error)
    }
  }

  // Start a test
  async startTest(testInfo: TestInfo): Promise<boolean> {
    try {
      this.testId = testInfo.testId
      this.exerciseType = testInfo.exerciseType
      this.exerciseName = testInfo.exerciseName

      // Create a test record in Supabase
      const { error } = await supabase.from("imu_tests").insert({
        id: testInfo.testId,
        user_id: testInfo.userId,
        tester_id: testInfo.testerId,
        current_exercise_type: testInfo.exerciseType,
        current_exercise_name: testInfo.exerciseName,
        start_time: new Date().toISOString(),
        status: "in_progress",
      })

      if (error) {
        console.error("Error creating test in Supabase:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error starting test:", error)
      return false
    }
  }

  // End an exercise and start a new one
  async endExercise(testInfo: TestInfo): Promise<boolean> {
    try {
      // Flush the buffer to ensure all data is saved
      await this.flushBuffer()

      // Update the test record in Supabase
      const { error } = await supabase
          .from("imu_tests")
          .update({
            current_exercise_type: testInfo.exerciseType,
            current_exercise_name: testInfo.exerciseName,
            last_updated: new Date().toISOString(),
          })
          .eq("id", testInfo.testId)

      if (error) {
        console.error("Error updating test in Supabase:", error)
        return false
      }

      this.exerciseType = testInfo.exerciseType
      this.exerciseName = testInfo.exerciseName

      return true
    } catch (error) {
      console.error("Error ending exercise:", error)
      return false
    }
  }

  // End a test
  async endTest(testId: string): Promise<boolean> {
    try {
      // Flush the buffer to ensure all data is saved
      await this.flushBuffer()

      // Update the test record in Supabase
      const { error } = await supabase
          .from("imu_tests")
          .update({
            status: "completed",
            end_time: new Date().toISOString(),
          })
          .eq("id", testId)

      if (error) {
        console.error("Error completing test in Supabase:", error)
        return false
      }

      // Generate and store the ZIP file
      const zipUrl = await this.generateZipFile(testId)

      this.testId = null
      this.exerciseType = null
      this.exerciseName = null

      return true
    } catch (error) {
      console.error("Error ending test:", error)
      return false
    }
  }

  // Generate a ZIP file with test data
  private async generateZipFile(testId: string): Promise<string | null> {
    try {
      // Fetch all data for this test
      const { data, error } = await supabase
          .from("imu_data")
          .select("*")
          .eq("test_id", testId)
          .order("timestamp", { ascending: true })

      if (error || !data) {
        console.error("Error fetching test data:", error)
        return null
      }

      // Group data by exercise
      const exerciseData: Record<string, SensorData[]> = {}

      data.forEach((item) => {
        const key = `${item.exercise_type}_${item.exercise_name}`
        if (!exerciseData[key]) {
          exerciseData[key] = []
        }
        exerciseData[key].push({
          accX: item.acc_x,
          accY: item.acc_y,
          accZ: item.acc_z,
          gyrX: item.gyr_x,
          gyrY: item.gyr_y,
          gyrZ: item.gyr_z,
          timestamp: item.timestamp,
        })
      })

      // Create CSV files for each exercise
      const files: Record<string, string> = {}

      for (const [key, dataArray] of Object.entries(exerciseData)) {
        // Convert to CSV
        const headers = "timestamp,accX,accY,accZ,gyrX,gyrY,gyrZ\n"
        const rows = dataArray
            .map((d) => `${d.timestamp},${d.accX},${d.accY},${d.accZ},${d.gyrX},${d.gyrY},${d.gyrZ}`)
            .join("\n")

        files[`${key}.csv`] = headers + rows
      }

      // Upload each file to Supabase Storage
      for (const [filename, content] of Object.entries(files)) {
        const { error } = await supabase.storage
            .from("test-data")
            .upload(`${testId}/${filename}`, new Blob([content], { type: "text/csv" }), {
              upsert: true,
            })

        if (error) {
          console.error(`Error uploading ${filename}:`, error)
        }
      }

      // Create a metadata file
      const metadata = {
        testId,
        exercises: Object.keys(exerciseData).map((key) => {
          const [type, name] = key.split("_")
          return { type, name, dataPoints: exerciseData[key].length }
        }),
        totalDataPoints: data.length,
        generatedAt: new Date().toISOString(),
      }

      const { error: metadataError } = await supabase.storage
          .from("test-data")
          .upload(
              `${testId}/metadata.json`,
              new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
              {
                upsert: true,
              },
          )

      if (metadataError) {
        console.error("Error uploading metadata:", metadataError)
      }

      // Get a public URL for the test folder
      const { data: urlData } = await supabase.storage
          .from("test-data")
          .createSignedUrl(`${testId}/metadata.json`, 60 * 60 * 24 * 7) // 7 days expiry

      if (urlData) {
        // Extract the base URL
        const baseUrl = urlData.signedUrl.split("/metadata.json")[0]

        // Store the URL in the database
        await supabase.from("test_downloads").insert({
          test_id: testId,
          download_url: baseUrl,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        })

        return baseUrl
      }

      return null
    } catch (error) {
      console.error("Error generating ZIP file:", error)
      return null
    }
  }

  // Get download URL for a test
  async getDownloadUrl(testId: string): Promise<string | null> {
    try {
      // Check if we have a stored URL
      const { data, error } = await supabase
          .from("test_downloads")
          .select("download_url, expires_at")
          .eq("test_id", testId)
          .single()

      if (error || !data) {
        // No stored URL, generate a new one
        return this.generateZipFile(testId)
      }

      // Check if the URL has expired
      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        // URL has expired, generate a new one
        return this.generateZipFile(testId)
      }

      return data.download_url
    } catch (error) {
      console.error("Error getting download URL:", error)
      return null
    }
  }

  // Add a data listener
  addDataListener(listener: (data: SensorData) => void): void {
    this.dataListeners.push(listener)
  }

  // Remove a data listener
  removeDataListener(listener: (data: SensorData) => void): void {
    const index = this.dataListeners.indexOf(listener)
    if (index !== -1) {
      this.dataListeners.splice(index, 1)
    }
  }

  // Start buffer flush interval
  private startBufferFlush(): void {
    // Flush buffer every 5 seconds
    this.bufferInterval = setInterval(async () => {
      await this.flushBuffer()
    }, 5000)
  }

  // Flush data buffer to Supabase
  private async flushBuffer(): Promise<void> {
    if (this.dataBuffer.length === 0 || !this.testId) return

    const dataToSend = [...this.dataBuffer]
    this.dataBuffer = []

    try {
      // Convert to Supabase format
      const supabaseData = dataToSend.map((data) => ({
        test_id: this.testId,
        exercise_type: this.exerciseType,
        exercise_name: this.exerciseName,
        acc_x: data.accX,
        acc_y: data.accY,
        acc_z: data.accZ,
        gyr_x: data.gyrX,
        gyr_y: data.gyrY,
        gyr_z: data.gyrZ,
        timestamp: data.timestamp,
      }))

      // Insert data in batches of 100
      for (let i = 0; i < supabaseData.length; i += 100) {
        const batch = supabaseData.slice(i, i + 100)
        const { error } = await supabase.from("imu_data").insert(batch)

        if (error) {
          console.error("Error inserting IMU data to Supabase:", error)
          // Add back to buffer for retry
          this.dataBuffer.push(...dataToSend.slice(i))
          break
        }
      }
    } catch (error) {
      console.error("Error flushing buffer:", error)
      // Add back to buffer for retry
      this.dataBuffer.push(...dataToSend)
    }
  }

  // Check if connected to a device
  isDeviceConnected(): boolean {
    return this.isConnected
  }
}

// Create a singleton instance
export const IMUClient = new IMUClientService()

// This is a placeholder service for IMU data handling
// It will be replaced with actual Bluetooth implementation later

export interface IMUData {
  accX: number
  accY: number
  accZ: number
  gyrX: number
  gyrY: number
  gyrZ: number
  timestamp: string
}

export class IMUService {
  private static instance: IMUService
  private isConnected = false
  private device: any = null
  private dataListeners: ((data: IMUData) => void)[] = []
  private mockInterval: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): IMUService {
    if (!IMUService.instance) {
      IMUService.instance = new IMUService()
    }
    return IMUService.instance
  }

  public async connect(device: any): Promise<boolean> {
    // In a real implementation, this would connect to the Bluetooth device
    // For now, we'll just simulate a connection
    this.device = device
    this.isConnected = true

    // Start generating mock data
    this.startMockDataGeneration()

    return true
  }

  public disconnect(): void {
    this.isConnected = false
    this.device = null

    if (this.mockInterval) {
      clearInterval(this.mockInterval)
      this.mockInterval = null
    }
  }

  public isDeviceConnected(): boolean {
    return this.isConnected
  }

  public addDataListener(listener: (data: IMUData) => void): void {
    this.dataListeners.push(listener)
  }

  public removeDataListener(listener: (data: IMUData) => void): void {
    const index = this.dataListeners.indexOf(listener)
    if (index !== -1) {
      this.dataListeners.splice(index, 1)
    }
  }

  private startMockDataGeneration(): void {
    // Generate mock IMU data at regular intervals
    this.mockInterval = setInterval(() => {
      const mockData: IMUData = {
        accX: this.randomValue(-1, 1),
        accY: this.randomValue(-1, 1),
        accZ: this.randomValue(0, 2), // Gravity
        gyrX: this.randomValue(-10, 10),
        gyrY: this.randomValue(-10, 10),
        gyrZ: this.randomValue(-10, 10),
        timestamp: new Date().toISOString(),
      }

      // Notify all listeners
      this.dataListeners.forEach((listener) => listener(mockData))
    }, 100) // 10 Hz
  }

  private randomValue(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  // In a real implementation, this would be replaced with actual Bluetooth communication
  public async readGATTCharacteristic(): Promise<IMUData> {
    return {
      accX: this.randomValue(-1, 1),
      accY: this.randomValue(-1, 1),
      accZ: this.randomValue(0, 2),
      gyrX: this.randomValue(-10, 10),
      gyrY: this.randomValue(-10, 10),
      gyrZ: this.randomValue(-10, 10),
      timestamp: new Date().toISOString(),
    }
  }

  // This would be implemented with the actual Web Bluetooth API in production
  public static async scanForDevices(): Promise<any[]> {
    // Mock implementation
    return [
      { id: "1F:4D:C8:D3:5E:96", name: "ArduinoIMU-1" },
      { id: "2E:5F:D9:E4:6F:A7", name: "ArduinoIMU-2" },
    ]
  }
}

"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bluetooth, Activity, Dumbbell, Timer, Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { BluetoothConnector } from "@/components/bluetooth-connector"
import { IMUClient, type SensorData } from "@/lib/imu-client"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { v4 as uuidv4 } from "uuid"

export default function NewTest() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("user-info")
  const [isConnected, setIsConnected] = useState(false)
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null)
  const [testId, setTestId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [liveData, setLiveData] = useState<SensorData | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataPointsRef = useRef<SensorData[]>([])

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
  })

  // Exercise progress tracking
  const [mobilityProgress, setMobilityProgress] = useState({
    "Neck flexion/extension": false,
    "Neck rotation": false,
    "Shoulder flexion/extension": false,
    "Hip flexion/extension": false,
    "Knee flexion/extension": false,
    "Ankle dorsiflexion/plantarflexion": false,
  })

  const [strengthProgress, setStrengthProgress] = useState({
    "Push-ups": false,
    Squats: false,
    Plank: false,
    "Vertical jump": false,
  })

  const [enduranceProgress, setEnduranceProgress] = useState({
    "3-minute step test": false,
    "1-minute jumping jacks": false,
    "30-second high knees": false,
  })

  // Handle IMU data updates
  const handleIMUData = (data: SensorData) => {
    setLiveData(data)
    dataPointsRef.current.push(data)

    // Keep only the last 100 data points
    if (dataPointsRef.current.length > 100) {
      dataPointsRef.current.shift()
    }

    // Update the visualization
    updateVisualization()
  }

  // Update the canvas visualization
  const updateVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 1

    // Vertical grid lines
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw data lines
    if (dataPointsRef.current.length < 2) return

    // Draw accelerometer data
    ctx.strokeStyle = "#00D4EF"
    ctx.lineWidth = 2
    ctx.beginPath()

    const dataPoints = dataPointsRef.current
    const pointWidth = width / (dataPoints.length - 1)

    // Map accelerometer data to canvas
    for (let i = 0; i < dataPoints.length; i++) {
      const data = dataPoints[i]
      // Use accX for visualization (can be changed to other values)
      const x = i * pointWidth
      // Map accelerometer range (-2 to 2) to canvas height
      const y = height / 2 - (data.accX * height) / 4

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Draw gyroscope data
    ctx.strokeStyle = "#FF5733"
    ctx.lineWidth = 2
    ctx.beginPath()

    // Map gyroscope data to canvas
    for (let i = 0; i < dataPoints.length; i++) {
      const data = dataPoints[i]
      // Use gyrX for visualization (can be changed to other values)
      const x = i * pointWidth
      // Map gyroscope range (-250 to 250) to canvas height
      const y = height / 2 - (data.gyrX * height) / 500

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Draw legend
    ctx.fillStyle = "#FFF"
    ctx.font = "12px Arial"
    ctx.fillText("Accelerometer X", 10, 20)
    ctx.fillStyle = "#00D4EF"
    ctx.fillRect(120, 12, 20, 10)

    ctx.fillStyle = "#FFF"
    ctx.fillText("Gyroscope X", 10, 40)
    ctx.fillStyle = "#FF5733"
    ctx.fillRect(120, 32, 20, 10)
  }

  const handleDeviceConnected = async (device: BluetoothDevice) => {
    try {
      const connected = await IMUClient.connectDevice(device)

      if (connected) {
        setConnectedDevice(device)
        setIsConnected(true)

        // Add data listener
        IMUClient.addDataListener(handleIMUData)
      } else {
        setError("Failed to connect to device. Please try again.")
      }
    } catch (err: any) {
      console.error("Error connecting to device:", err)
      setError(err.message || "Failed to connect to device")
    }
  }

  const handleStartTest = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Generate a unique test ID
      const newTestId = uuidv4()
      setTestId(newTestId)

      // Get current user (tester) from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const testerId = session?.user?.id || "unknown-tester"

      // Create a new customer in Supabase
      const { data: customer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: userInfo.name,
            email: userInfo.email || `${userInfo.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
            age: Number.parseInt(userInfo.age) || 0,
            gender: userInfo.gender,
            height: Number.parseFloat(userInfo.height) || 0,
            weight: Number.parseFloat(userInfo.weight) || 0,
            sleep_levels: 0,
            activity_level: "Moderate",
            calorie_intake: 2000,
            mood: "Good",
          })
          .select()
          .single()

      if (customerError) {
        throw new Error(`Failed to create customer: ${customerError.message}`)
      }

      // Create a new test in Supabase
      const { error: testError } = await supabase.from("tests").insert({
        id: newTestId,
        customer_id: customer.id,
        tester_id: testerId,
        status: "In Progress",
      })

      if (testError) {
        throw new Error(`Failed to create test: ${testError.message}`)
      }

      // Create exercises in Supabase
      const exercises = [
        ...Object.keys(mobilityProgress).map((name) => ({ name, category: "mobility", test_id: newTestId })),
        ...Object.keys(strengthProgress).map((name) => ({ name, category: "strength", test_id: newTestId })),
        ...Object.keys(enduranceProgress).map((name) => ({ name, category: "endurance", test_id: newTestId })),
      ]

      const { error: exercisesError } = await supabase.from("exercises").insert(exercises)

      if (exercisesError) {
        throw new Error(`Failed to create exercises: ${exercisesError.message}`)
      }

      // Start the test in the IMU client
      const started = await IMUClient.startTest({
        testId: newTestId,
        userId: customer.id,
        testerId,
        exerciseType: "mobility",
        exerciseName: Object.keys(mobilityProgress)[0],
      })

      if (!started) {
        throw new Error("Failed to start IMU test")
      }

      // Move to mobility tab
      setActiveTab("mobility")
    } catch (err: any) {
      console.error("Error starting test:", err)
      setError(err.message || "Failed to start test. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteExercise = async (
      exerciseName: string,
      category: string,
      progressSetter: React.Dispatch<React.SetStateAction<any>>,
  ) => {
    if (!testId) return

    try {
      // Update exercise progress locally
      progressSetter((prev) => ({
        ...prev,
        [exerciseName]: true,
      }))

      // Update exercise in Supabase
      const { error } = await supabase
          .from("exercises")
          .update({ completed: true })
          .eq("test_id", testId)
          .eq("name", exerciseName)

      if (error) {
        throw new Error(`Failed to update exercise: ${error.message}`)
      }

      // Get next exercise name
      const nextExerciseName = Object.keys(progressSetter({}))[0]

      // Update the IMU client with the next exercise
      await IMUClient.endExercise({
        testId,
        userId: "", // Not needed for this call
        testerId: "", // Not needed for this call
        exerciseType: category,
        exerciseName: nextExerciseName,
      })
    } catch (err: any) {
      console.error("Error completing exercise:", err)
      setError(err.message || "Failed to record exercise completion. Please try again.")
    }
  }

  const handleCompleteSection = async (nextSection: string) => {
    // Move to the next section
    setActiveTab(nextSection)

    // Get the first exercise of the next section
    let nextExerciseName = ""
    let nextExerciseType = ""

    if (nextSection === "strength") {
      nextExerciseName = Object.keys(strengthProgress)[0]
      nextExerciseType = "strength"
    } else if (nextSection === "endurance") {
      nextExerciseName = Object.keys(enduranceProgress)[0]
      nextExerciseType = "endurance"
    }

    // Update the IMU client with the next exercise
    if (nextExerciseName && nextExerciseType) {
      await IMUClient.endExercise({
        testId,
        userId: "", // Not needed for this call
        testerId: "", // Not needed for this call
        exerciseType: nextExerciseType,
        exerciseName: nextExerciseName,
      })
    }
  }

  const handleFinishTest = async () => {
    if (!testId) return

    setIsLoading(true)
    setError(null)

    try {
      // Update test status in Supabase
      const { error: testError } = await supabase.from("tests").update({ status: "Completed" }).eq("id", testId)

      if (testError) {
        throw new Error(`Failed to update test: ${testError.message}`)
      }

      // End the test in the IMU client
      const ended = await IMUClient.endTest(testId)

      if (!ended) {
        throw new Error("Failed to end IMU test")
      }

      // Get download URL
      const url = await IMUClient.getDownloadUrl(testId)

      if (url) {
        setDownloadUrl(url)
      }

      alert("Test completed successfully! You can now download the data.")
    } catch (err: any) {
      console.error("Error finishing test:", err)
      setError(err.message || "Failed to complete test. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadData = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank")
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Remove data listener
      if (IMUClient.isDeviceConnected()) {
        IMUClient.removeDataListener(handleIMUData)
        IMUClient.disconnectDevice()
      }
    }
  }, [])

  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">New Test</h2>
        </div>

        {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="user-info">User Info</TabsTrigger>
            <TabsTrigger value="mobility" disabled={activeTab === "user-info"}>
              Mobility
            </TabsTrigger>
            <TabsTrigger value="strength" disabled={activeTab === "user-info" || activeTab === "mobility"}>
              Strength
            </TabsTrigger>
            <TabsTrigger
                value="endurance"
                disabled={activeTab === "user-info" || activeTab === "mobility" || activeTab === "strength"}
            >
              Endurance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user-info">
            <Card className="border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>Enter the user details before starting the test</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={userInfo.name}
                        onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                        placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={userInfo.email}
                        onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                        placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                        id="age"
                        type="number"
                        value={userInfo.age}
                        onChange={(e) => setUserInfo({ ...userInfo, age: e.target.value })}
                        placeholder="25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input
                        id="gender"
                        value={userInfo.gender}
                        onChange={(e) => setUserInfo({ ...userInfo, gender: e.target.value })}
                        placeholder="Male/Female/Other"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                        id="height"
                        type="number"
                        value={userInfo.height}
                        onChange={(e) => setUserInfo({ ...userInfo, height: e.target.value })}
                        placeholder="175"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                        id="weight"
                        type="number"
                        value={userInfo.weight}
                        onChange={(e) => setUserInfo({ ...userInfo, weight: e.target.value })}
                        placeholder="70"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>IMU Sensor Connection</Label>
                  {!isConnected ? (
                      <BluetoothConnector onConnected={handleDeviceConnected} />
                  ) : (
                      <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="bg-green-500/20 text-green-500 hover:bg-green-500/20 hover:text-green-500"
                        >
                          <Bluetooth className="mr-2 h-4 w-4" />
                          Connected to {connectedDevice?.name || "IMU Sensor"}
                        </Button>
                        <span className="text-sm text-green-500">Device connected successfully</span>
                      </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                    className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90 ml-auto"
                    onClick={handleStartTest}
                    disabled={!isConnected || !userInfo.name || isLoading}
                >
                  {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                  ) : (
                      "Start Test"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="mobility">
            <Card className="border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-[#00D4EF]" />
                  Mobility Test
                </CardTitle>
                <CardDescription>Assess the user's range of motion and flexibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                    <h3 className="font-medium mb-2">Test Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Ensure the IMU sensor is properly attached to the user</li>
                      <li>Ask the user to stand in a neutral position</li>
                      <li>Guide the user through the following movements:</li>
                      <ul className="list-disc list-inside ml-6 space-y-1">
                        <li>Neck flexion/extension (looking up and down)</li>
                        <li>Neck rotation (looking left and right)</li>
                        <li>Shoulder flexion/extension</li>
                        <li>Hip flexion/extension</li>
                        <li>Knee flexion/extension</li>
                        <li>Ankle dorsiflexion/plantarflexion</li>
                      </ul>
                      <li>Record each movement for 10 seconds</li>
                      <li>Allow brief rest between movements</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                      <h3 className="font-medium mb-2">Live Data</h3>
                      <div className="h-[200px] bg-black/50 rounded-md flex items-center justify-center">
                        {liveData ? (
                            <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Waiting for IMU sensor data...</p>
                        )}
                      </div>
                      {liveData && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Acc X:</span> {liveData.accX.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acc Y:</span> {liveData.accY.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acc Z:</span> {liveData.accZ.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr X:</span> {liveData.gyrX.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr Y:</span> {liveData.gyrY.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr Z:</span> {liveData.gyrZ.toFixed(2)}
                            </div>
                          </div>
                      )}
                    </div>

                    <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                      <h3 className="font-medium mb-2">Test Progress</h3>
                      <div className="space-y-2">
                        {Object.entries(mobilityProgress).map(([name, completed], i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${completed ? "bg-green-500" : "bg-muted"}`}></div>
                                <span className={completed ? "text-sm" : "text-sm text-muted-foreground"}>{name}</span>
                              </div>
                              {!completed && (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => handleCompleteExercise(name, "mobility", setMobilityProgress)}
                                  >
                                    Complete
                                  </Button>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel Test</Button>
                <Button
                    className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                    onClick={() => handleCompleteSection("strength")}
                    disabled={!Object.values(mobilityProgress).every(Boolean)}
                >
                  Complete & Continue
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="strength">
            <Card className="border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Dumbbell className="mr-2 h-5 w-5 text-[#00D4EF]" />
                  Strength Test
                </CardTitle>
                <CardDescription>Measure the user's muscular strength and power</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                    <h3 className="font-medium mb-2">Test Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Ensure the IMU sensor is properly attached to the user</li>
                      <li>Guide the user through the following exercises:</li>
                      <ul className="list-disc list-inside ml-6 space-y-1">
                        <li>Push-ups (maximum in 30 seconds)</li>
                        <li>Squats (maximum in 30 seconds)</li>
                        <li>Plank (maximum hold time)</li>
                        <li>Vertical jump (maximum height)</li>
                      </ul>
                      <li>Record data for each exercise</li>
                      <li>Allow 1-minute rest between exercises</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                      <h3 className="font-medium mb-2">Live Data</h3>
                      <div className="h-[200px] bg-black/50 rounded-md flex items-center justify-center">
                        {liveData ? (
                            <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Waiting for IMU sensor data...</p>
                        )}
                      </div>
                      {liveData && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Acc X:</span> {liveData.accX.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acc Y:</span> {liveData.accY.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acc Z:</span> {liveData.accZ.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr X:</span> {liveData.gyrX.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr Y:</span> {liveData.gyrY.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr Z:</span> {liveData.gyrZ.toFixed(2)}
                            </div>
                          </div>
                      )}
                    </div>

                    <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                      <h3 className="font-medium mb-2">Test Progress</h3>
                      <div className="space-y-2">
                        {Object.entries(strengthProgress).map(([name, completed], i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${completed ? "bg-green-500" : "bg-muted"}`}></div>
                                <span className={completed ? "text-sm" : "text-sm text-muted-foreground"}>{name}</span>
                              </div>
                              {!completed && (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => handleCompleteExercise(name, "strength", setStrengthProgress)}
                                  >
                                    Complete
                                  </Button>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel Test</Button>
                <Button
                    className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                    onClick={() => handleCompleteSection("endurance")}
                    disabled={!Object.values(strengthProgress).every(Boolean)}
                >
                  Complete & Continue
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="endurance">
            <Card className="border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="mr-2 h-5 w-5 text-[#00D4EF]" />
                  Endurance Test
                </CardTitle>
                <CardDescription>Evaluate the user's cardiovascular endurance and stamina</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                    <h3 className="font-medium mb-2">Test Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Ensure the IMU sensor is properly attached to the user</li>
                      <li>Guide the user through the following tests:</li>
                      <ul className="list-disc list-inside ml-6 space-y-1">
                        <li>3-minute step test</li>
                        <li>1-minute jumping jacks</li>
                        <li>30-second high knees</li>
                      </ul>
                      <li>Record heart rate before and after each test</li>
                      <li>Allow 2-minute rest between tests</li>
                      <li>Monitor recovery time</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                      <h3 className="font-medium mb-2">Live Data</h3>
                      <div className="h-[200px] bg-black/50 rounded-md flex items-center justify-center">
                        {liveData ? (
                            <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Waiting for IMU sensor data...</p>
                        )}
                      </div>
                      {liveData && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Acc X:</span> {liveData.accX.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acc Y:</span> {liveData.accY.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acc Z:</span> {liveData.accZ.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr X:</span> {liveData.gyrX.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr Y:</span> {liveData.gyrY.toFixed(2)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gyr Z:</span> {liveData.gyrZ.toFixed(2)}
                            </div>
                          </div>
                      )}
                    </div>

                    <div className="p-4 border border-[#00D4EF]/20 rounded-md">
                      <h3 className="font-medium mb-2">Test Progress</h3>
                      <div className="space-y-2">
                        {Object.entries(enduranceProgress).map(([name, completed], i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${completed ? "bg-green-500" : "bg-muted"}`}></div>
                                <span className={completed ? "text-sm" : "text-sm text-muted-foreground"}>{name}</span>
                              </div>
                              {!completed && (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => handleCompleteExercise(name, "endurance", setEnduranceProgress)}
                                  >
                                    Complete
                                  </Button>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel Test</Button>
                <Button
                    className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                    onClick={handleFinishTest}
                    disabled={!Object.values(enduranceProgress).every(Boolean) || isLoading}
                >
                  {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                  ) : (
                      "Complete Test"
                  )}
                </Button>
              </CardFooter>
            </Card>

            {downloadUrl && (
                <Card className="border-[#00D4EF]/20 mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Download className="mr-2 h-5 w-5 text-[#00D4EF]" />
                      Test Data Available
                    </CardTitle>
                    <CardDescription>Your test data is ready for download</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      All test data has been processed and is available for download. This file contains CSV data for all
                      exercises with proper SI units.
                    </p>
                    <Button onClick={handleDownloadData} className="w-full bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90">
                      <Download className="mr-2 h-4 w-4" />
                      Download Test Data
                    </Button>
                  </CardContent>
                </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
  )
}

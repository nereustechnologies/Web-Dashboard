"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bluetooth, Activity, Dumbbell, Timer, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { BluetoothConnector } from "@/components/bluetooth-connector"
import type { ScanResult } from "@/lib/imu-client"

export default function NewTest() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("user-info")
  const [isConnected, setIsConnected] = useState(false)
  const [connectedDevice, setConnectedDevice] = useState<ScanResult | null>(null)
  const [testId, setTestId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

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

  const handleDeviceConnected = (device: ScanResult) => {
    setConnectedDevice(device)
    setIsConnected(true)
  }

  const handleStartTest = async () => {
    setIsLoading(true)
    try {
      // Create a new customer
      const customerResponse = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userInfo.name,
          email: userInfo.email,
          age: Number.parseInt(userInfo.age),
          gender: userInfo.gender,
          height: Number.parseFloat(userInfo.height),
          weight: Number.parseFloat(userInfo.weight),
          sleepLevels: 0,
          activityLevel: "Moderate",
          calorieIntake: 2000,
          mood: "Good",
        }),
      })

      if (!customerResponse.ok) {
        throw new Error("Failed to create customer")
      }

      const customer = await customerResponse.json()

      // Create a new test
      const testResponse = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          testerId: "current-tester-id", // Replace with actual tester ID from auth
          exercises: [
            ...Object.keys(mobilityProgress).map((name) => ({ name, category: "mobility" })),
            ...Object.keys(strengthProgress).map((name) => ({ name, category: "strength" })),
            ...Object.keys(enduranceProgress).map((name) => ({ name, category: "endurance" })),
          ],
        }),
      })

      if (!testResponse.ok) {
        throw new Error("Failed to create test")
      }

      const test = await testResponse.json()
      setTestId(test.id)

      // Move to mobility tab
      setActiveTab("mobility")
    } catch (error) {
      console.error("Error starting test:", error)
      alert("Failed to start test. Please try again.")
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

      // Create a new exercise record in the database
      await fetch(`/api/tests/${testId}/exercise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exerciseType: category,
          exerciseName,
        }),
      })
    } catch (error) {
      console.error("Error completing exercise:", error)
      alert("Failed to record exercise completion. Please try again.")
    }
  }

  const handleCompleteSection = async (nextSection: string) => {
    // Move to the next section
    setActiveTab(nextSection)
  }

  const handleFinishTest = async () => {
    if (!testId) return

    setIsLoading(true)
    try {
      // Update test status to completed
      await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Completed",
        }),
      })

      // Get download URL
      const downloadResponse = await fetch(`/api/tests/${testId}/download`)
      if (downloadResponse.ok) {
        const data = await downloadResponse.json()
        setDownloadUrl(data.download_url)
      }

      // Prepare the download
      await fetch(`/api/tests/${testId}/download`, {
        method: "POST",
      })

      alert("Test completed successfully! You can now download the data.")
    } catch (error) {
      console.error("Error finishing test:", error)
      alert("Failed to complete test. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadData = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">New Test</h2>
      </div>

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
                disabled={!isConnected || !userInfo.name || !userInfo.email || isLoading}
              >
                {isLoading ? "Starting..." : "Start Test"}
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
                      <p className="text-sm text-muted-foreground">IMU sensor data visualization will appear here</p>
                    </div>
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
                      <p className="text-sm text-muted-foreground">IMU sensor data visualization will appear here</p>
                    </div>
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
                      <p className="text-sm text-muted-foreground">IMU sensor data visualization will appear here</p>
                    </div>
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
                {isLoading ? "Completing..." : "Complete Test"}
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
                  All test data has been processed and is available as a ZIP file. This file contains CSV data for all
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

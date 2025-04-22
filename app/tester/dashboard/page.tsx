"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Users, ClipboardCheck, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function TesterDashboard() {
  const [dashboardData, setDashboardData] = useState({
    testsCompleted: 0,
    usersTested: 0,
    avgTestDuration: "0m",
    dataPoints: 0,
    recentTests: [],
    testDistribution: {
      mobility: 0,
      strength: 0,
      endurance: 0,
    },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).single()

        setCurrentUser(userData)
        return userData?.id
      }
      return null
    }

    const fetchDashboardData = async () => {
      try {
        const testerId = await fetchCurrentUser()

        if (!testerId) {
          console.error("No tester ID found")
          setIsLoading(false)
          return
        }

        // Fetch tests for this tester
        const { data: tests, error: testsError } = await supabase
            .from("tests")
            .select(`
            *,
            customer:customers(*),
            exercises(*)
          `)
            .eq("tester_id", testerId)
            .order("date", { ascending: false })

        if (testsError) throw testsError

        // Fetch IMU data count for this tester's tests
        let dataCount = 0
        if (tests && tests.length > 0) {
          const testIds = tests.map((test) => test.id)
          const { count, error: dataError } = await supabase
              .from("imu_data")
              .select("*", { count: "exact", head: true })
              .in("test_id", testIds)

          if (!dataError) {
            dataCount = count || 0
          }
        }

        // Calculate dashboard metrics
        const completedTests = tests?.filter((test) => test.status === "Completed") || []

        // Calculate unique users tested
        const uniqueCustomerIds = new Set(tests?.map((test) => test.customer_id) || [])

        // Calculate test duration (this would ideally come from actual test durations)
        let totalDurationMinutes = 0
        completedTests.forEach((test) => {
          if (test.start_time && test.end_time) {
            const start = new Date(test.start_time)
            const end = new Date(test.end_time)
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
            totalDurationMinutes += durationMinutes
          }
        })

        const avgDuration = completedTests.length > 0 ? Math.round(totalDurationMinutes / completedTests.length) : 0

        // Calculate test distribution
        const allExercises = tests?.flatMap((test) => test.exercises || []) || []
        const mobilityCount = allExercises.filter((ex) => ex.category === "mobility").length
        const strengthCount = allExercises.filter((ex) => ex.category === "strength").length
        const enduranceCount = allExercises.filter((ex) => ex.category === "endurance").length
        const totalExercises = Math.max(1, allExercises.length) // Avoid division by zero

        // Format recent tests
        const recentTests = (tests || []).slice(0, 5).map((test) => ({
          user: test.customer?.name || "Unknown User",
          type: test.exercises?.[0]?.category || "Unknown",
          date: new Date(test.date).toISOString().split("T")[0],
        }))

        // Update state with real data
        setDashboardData({
          testsCompleted: completedTests.length,
          usersTested: uniqueCustomerIds.size,
          avgTestDuration: `${avgDuration || 24}m`, // Default to 24m if no data
          dataPoints: dataCount,
          recentTests,
          testDistribution: {
            mobility: Math.round((mobilityCount / totalExercises) * 100),
            strength: Math.round((strengthCount / totalExercises) * 100),
            endurance: Math.round((enduranceCount / totalExercises) * 100),
          },
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#00D4EF]" />
        </div>
    )
  }

  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Tester Dashboard</h2>
          <Button className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90" asChild>
            <Link href="/tester/tests/new">Start New Test</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.testsCompleted}</div>
              <p className="text-xs text-muted-foreground">Total completed tests</p>
            </CardContent>
          </Card>

          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users Tested</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.usersTested}</div>
              <p className="text-xs text-muted-foreground">Unique users tested</p>
            </CardContent>
          </Card>

          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Test Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.avgTestDuration}</div>
              <p className="text-xs text-muted-foreground">Avg. test time</p>
            </CardContent>
          </Card>

          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.dataPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total data collected</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-[#00D4EF]/20">
            <CardHeader>
              <CardTitle>Recent Tests</CardTitle>
              <CardDescription>Your recently conducted tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recentTests.length > 0 ? (
                    dashboardData.recentTests.map((test, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between border-b border-[#00D4EF]/10 py-2 last:border-0"
                        >
                          <div>
                            <p className="font-medium">{test.user}</p>
                            <p className="text-sm text-muted-foreground">{test.date}</p>
                          </div>
                          <div>
                      <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              test.type === "mobility"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : test.type === "strength"
                                      ? "bg-green-500/10 text-green-500"
                                      : "bg-orange-500/10 text-orange-500"
                          }`}
                      >
                        {test.type}
                      </span>
                          </div>
                        </div>
                    ))
                ) : (
                    <div className="py-4 text-center text-muted-foreground">No tests conducted yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#00D4EF]/20">
            <CardHeader>
              <CardTitle>Test Distribution</CardTitle>
              <CardDescription>Breakdown of test types conducted</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[300px]">
              <div className="w-full max-w-md grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-full h-32 bg-blue-500/20 rounded-md relative overflow-hidden">
                    <div
                        className="absolute bottom-0 w-full bg-blue-500"
                        style={{ height: `${dashboardData.testDistribution.mobility}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm font-medium">Mobility</p>
                  <p className="text-xs text-muted-foreground">{dashboardData.testDistribution.mobility}%</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-32 bg-green-500/20 rounded-md relative overflow-hidden">
                    <div
                        className="absolute bottom-0 w-full bg-green-500"
                        style={{ height: `${dashboardData.testDistribution.strength}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm font-medium">Strength</p>
                  <p className="text-xs text-muted-foreground">{dashboardData.testDistribution.strength}%</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-32 bg-orange-500/20 rounded-md relative overflow-hidden">
                    <div
                        className="absolute bottom-0 w-full bg-orange-500"
                        style={{ height: `${dashboardData.testDistribution.endurance}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm font-medium">Endurance</p>
                  <p className="text-xs text-muted-foreground">{dashboardData.testDistribution.endurance}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Users, ClipboardCheck, LineChart, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeTesters: 0,
    testsCompleted: 0,
    dataPoints: 0,
    recentTests: [],
    testerPerformance: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch users from Supabase
        const { data: users, error: usersError } = await supabase.from("users").select("*")

        if (usersError) throw usersError

        // Fetch tests from Supabase
        const { data: tests, error: testsError } = await supabase
            .from("tests")
            .select(`
            *,
            customer:customers(*),
            tester:users(*),
            exercises(*)
          `)
            .order("date", { ascending: false })

        if (testsError) throw testsError

        // Fetch IMU data count from Supabase
        const { count: dataCount, error: dataError } = await supabase
            .from("imu_data")
            .select("*", { count: "exact", head: true })

        if (dataError) throw dataError

        // Calculate dashboard metrics
        const testers = users?.filter((user) => user.role === "tester") || []
        const completedTests = tests?.filter((test) => test.status === "Completed") || []

        // Calculate tester performance
        const testerPerformance = testers
            .map((tester) => {
              const testerTests = tests?.filter((test) => test.tester_id === tester.id) || []
              return {
                name: tester.name,
                tests: testerTests.length,
                progress: Math.min(100, (testerTests.length / Math.max(1, tests?.length || 1)) * 100),
              }
            })
            .sort((a, b) => b.tests - a.tests)
            .slice(0, 4)

        // Format recent tests
        const recentTests = (tests || []).slice(0, 5).map((test) => ({
          user: test.customer?.name || "Unknown User",
          tester: test.tester?.name || "Unknown Tester",
          type: test.exercises?.[0]?.category || "Unknown",
          date: new Date(test.date).toISOString().split("T")[0],
        }))

        // Update state with real data
        setDashboardData({
          totalUsers: users?.length || 0,
          activeTesters: testers.length,
          testsCompleted: completedTests.length,
          dataPoints: dataCount || 0,
          recentTests,
          testerPerformance,
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
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-[#00D4EF]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Platform users</p>
                </CardContent>
              </Card>

              <Card className="border-[#00D4EF]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Testers</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.activeTesters}</div>
                  <p className="text-xs text-muted-foreground">Registered testers</p>
                </CardContent>
              </Card>

              <Card className="border-[#00D4EF]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.testsCompleted}</div>
                  <p className="text-xs text-muted-foreground">Total completed tests</p>
                </CardContent>
              </Card>

              <Card className="border-[#00D4EF]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.dataPoints.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total data points collected</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 border-[#00D4EF]/20">
                <CardHeader>
                  <CardTitle>Recent Tests</CardTitle>
                  <CardDescription>Tests completed recently</CardDescription>
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
                                <p className="text-sm text-muted-foreground">Tested by: {test.tester}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[#00D4EF]">{test.type}</p>
                                <p className="text-sm text-muted-foreground">{test.date}</p>
                              </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-4 text-center text-muted-foreground">No tests completed yet</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3 border-[#00D4EF]/20">
                <CardHeader>
                  <CardTitle>Tester Performance</CardTitle>
                  <CardDescription>Tests completed by tester</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.testerPerformance.length > 0 ? (
                        dashboardData.testerPerformance.map((tester, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{tester.name}</p>
                                <p className="text-sm text-muted-foreground">{tester.tests} tests</p>
                              </div>
                              <div className="h-2 w-full rounded-full bg-secondary">
                                <div className="h-full rounded-full bg-[#00D4EF]" style={{ width: `${tester.progress}%` }} />
                              </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-4 text-center text-muted-foreground">No tester data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Detailed analytics from Supabase</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Analytics dashboard coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Generated reports from Supabase</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Reports dashboard coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}

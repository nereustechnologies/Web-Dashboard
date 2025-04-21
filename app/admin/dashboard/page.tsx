import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Users, ClipboardCheck, LineChart } from "lucide-react"

export default function AdminDashboard() {
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
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">+2 from last week</p>
              </CardContent>
            </Card>

            <Card className="border-[#00D4EF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Testers</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">+1 from last week</p>
              </CardContent>
            </Card>

            <Card className="border-[#00D4EF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">+8 from last week</p>
              </CardContent>
            </Card>

            <Card className="border-[#00D4EF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,234</div>
                <p className="text-xs text-muted-foreground">+1,234 from last week</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 border-[#00D4EF]/20">
              <CardHeader>
                <CardTitle>Recent Tests</CardTitle>
                <CardDescription>Tests completed in the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { user: "John Doe", tester: "Alice Smith", type: "Mobility", date: "2023-04-20" },
                    { user: "Jane Smith", tester: "Bob Johnson", type: "Strength", date: "2023-04-19" },
                    { user: "Mike Johnson", tester: "Alice Smith", type: "Endurance", date: "2023-04-18" },
                    { user: "Sarah Williams", tester: "Charlie Brown", type: "Mobility", date: "2023-04-17" },
                    { user: "David Brown", tester: "Bob Johnson", type: "Strength", date: "2023-04-16" },
                  ].map((test, i) => (
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
                  ))}
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
                  {[
                    { name: "Alice Smith", tests: 18, progress: 75 },
                    { name: "Bob Johnson", tests: 12, progress: 50 },
                    { name: "Charlie Brown", tests: 8, progress: 33 },
                    { name: "Diana Prince", tests: 4, progress: 17 },
                  ].map((tester, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{tester.name}</p>
                        <p className="text-sm text-muted-foreground">{tester.tests} tests</p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-[#00D4EF]" style={{ width: `${tester.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="border-[#00D4EF]/20">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Detailed analytics will be available after Supabase integration</CardDescription>
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
              <CardDescription>Generated reports will be available after Supabase integration</CardDescription>
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

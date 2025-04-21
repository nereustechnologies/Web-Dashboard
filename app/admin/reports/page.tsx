import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, User, Users, BarChart } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Reports</TabsTrigger>
          <TabsTrigger value="testers">Tester Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>View detailed reports for each user</CardDescription>
              </div>
              <User className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "John Doe", tests: 3, lastTest: "2023-04-20", improvement: "+12%" },
                  { name: "Jane Smith", tests: 2, lastTest: "2023-04-19", improvement: "+8%" },
                  { name: "Mike Johnson", tests: 1, lastTest: "2023-04-18", improvement: "N/A" },
                  { name: "Sarah Williams", tests: 4, lastTest: "2023-04-17", improvement: "+15%" },
                  { name: "David Brown", tests: 2, lastTest: "2023-04-16", improvement: "+5%" },
                ].map((user, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-[#00D4EF]/10 py-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">Last test: {user.lastTest}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">{user.tests} tests</p>
                        <p className="text-sm text-[#00D4EF]">{user.improvement}</p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testers" className="space-y-4">
          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Tester Reports</CardTitle>
                <CardDescription>View detailed reports for each tester</CardDescription>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Alice Smith", tests: 18, lastActive: "Today", efficiency: "High" },
                  { name: "Bob Johnson", tests: 12, lastActive: "Yesterday", efficiency: "Medium" },
                  { name: "Charlie Brown", tests: 8, lastActive: "3 days ago", efficiency: "Medium" },
                  { name: "Diana Prince", tests: 4, lastActive: "1 week ago", efficiency: "Low" },
                ].map((tester, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-[#00D4EF]/10 py-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{tester.name}</p>
                      <p className="text-sm text-muted-foreground">Last active: {tester.lastActive}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">{tester.tests} tests</p>
                        <p
                          className={`text-sm ${
                            tester.efficiency === "High"
                              ? "text-green-500"
                              : tester.efficiency === "Medium"
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {tester.efficiency} efficiency
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="border-[#00D4EF]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>Platform usage and test statistics</CardDescription>
              </div>
              <BarChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">
                  Analytics dashboard will be available after Supabase integration
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

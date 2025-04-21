import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Users, ClipboardCheck, Clock } from "lucide-react"
import Link from "next/link"

export default function TesterDashboard() {
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
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+3 from last week</p>
          </CardContent>
        </Card>

        <Card className="border-[#00D4EF]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Tested</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>

        <Card className="border-[#00D4EF]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24m</div>
            <p className="text-xs text-muted-foreground">Avg. test time</p>
          </CardContent>
        </Card>

        <Card className="border-[#00D4EF]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,642</div>
            <p className="text-xs text-muted-foreground">+842 from last week</p>
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
              {[
                { user: "John Doe", type: "Mobility", date: "2023-04-20" },
                { user: "Jane Smith", type: "Strength", date: "2023-04-19" },
                { user: "Mike Johnson", type: "Endurance", date: "2023-04-18" },
                { user: "Sarah Williams", type: "Mobility", date: "2023-04-17" },
                { user: "David Brown", type: "Strength", date: "2023-04-16" },
              ].map((test, i) => (
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
                        test.type === "Mobility"
                          ? "bg-blue-500/10 text-blue-500"
                          : test.type === "Strength"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-orange-500/10 text-orange-500"
                      }`}
                    >
                      {test.type}
                    </span>
                  </div>
                </div>
              ))}
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
                  <div className="absolute bottom-0 w-full bg-blue-500 h-[45%]"></div>
                </div>
                <p className="mt-2 text-sm font-medium">Mobility</p>
                <p className="text-xs text-muted-foreground">45%</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full h-32 bg-green-500/20 rounded-md relative overflow-hidden">
                  <div className="absolute bottom-0 w-full bg-green-500 h-[30%]"></div>
                </div>
                <p className="mt-2 text-sm font-medium">Strength</p>
                <p className="text-xs text-muted-foreground">30%</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full h-32 bg-orange-500/20 rounded-md relative overflow-hidden">
                  <div className="absolute bottom-0 w-full bg-orange-500 h-[25%]"></div>
                </div>
                <p className="mt-2 text-sm font-medium">Endurance</p>
                <p className="text-xs text-muted-foreground">25%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

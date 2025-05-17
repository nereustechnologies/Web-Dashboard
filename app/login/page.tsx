"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NereusLogo } from "@/components/nereus-logo"
import { AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Demo users for quick login
const DEMO_USERS = {
  admin: { email: "admin@nereus.com", password: "admin123", role: "admin" },
  tester: { email: "tester@nereus.com", password: "tester123", role: "tester" },
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [seedSuccess, setSeedSuccess] = useState(false)

  // Login using Supabase Auth
  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log("Login response:", email, password, data, error)
      if (error || !data.user) {
        throw new Error("Invalid email or password")
      }

      const role = data.user.user_metadata?.role || "tester"
      if (role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/tester/dashboard")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(err.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to pre-fill demo credentials
  const fillDemoCredentials = (type) => {
    if (type === "admin") {
      setEmail(DEMO_USERS.admin.email)
      setPassword(DEMO_USERS.admin.password)
    } else {
      setEmail(DEMO_USERS.tester.email)
      setPassword(DEMO_USERS.tester.password)
    }
    setSeedSuccess(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-[#00D4EF]/30">
        <CardHeader className="space-y-2 flex flex-col items-center">
          <NereusLogo className="w-16 h-16 mb-2" />
          <CardTitle className="text-2xl font-bold">Login to Nereus</CardTitle>
          <CardDescription>Enter your credentials to access the IMU testing platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="admin" disabled>
                Admin Access
              </TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {registered && (
                <Alert className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Registration Successful</AlertTitle>
                  <AlertDescription>Your account has been created. You can now log in.</AlertDescription>
                </Alert>
              )}

              {seedSuccess && (
                <Alert className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Demo Credentials Loaded</AlertTitle>
                  <AlertDescription>You can now login with the pre-filled credentials.</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-center text-sm text-muted-foreground gap-2">
          <p>For testing, use one of these accounts:</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fillDemoCredentials("admin")} className="text-xs">
              Use Admin Account
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemoCredentials("tester")} className="text-xs">
              Use Tester Account
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

"use client"

import type React from "react"

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
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [seedingDatabase, setSeedingDatabase] = useState(false)
  const [seedSuccess, setSeedSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      // Redirect based on role
      if (data.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/tester/dashboard")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  const seedDatabase = async () => {
    setSeedingDatabase(true)
    setSeedSuccess(false)
    setError("")

    try {
      const response = await fetch("/api/seed", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to seed database")
      }

      setSeedSuccess(true)
    } catch (err: any) {
      console.error("Seed error:", err)
      setError(err.message || "Failed to seed database")
    } finally {
      setSeedingDatabase(false)
    }
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
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>Database seeded successfully with test accounts.</AlertDescription>
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

                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-[#00D4EF] hover:underline">
                      Register as Admin
                    </Link>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col items-center text-center text-sm text-muted-foreground gap-2">
            <p>For testing: admin@nereus.com / admin123 or tester@nereus.com / tester123</p>
            <Button variant="outline" size="sm" onClick={seedDatabase} disabled={seedingDatabase} className="text-xs">
              {seedingDatabase ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Creating test accounts...
                  </>
              ) : (
                  "Create test accounts"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
  )
}

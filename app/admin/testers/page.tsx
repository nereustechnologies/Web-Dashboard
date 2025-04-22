"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Edit, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ManageTesters() {
  const [testers, setTesters] = useState([])
  const [newTester, setNewTester] = useState({ name: "", email: "", password: "" })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Fetch testers on component mount
  useEffect(() => {
    fetchTesters()
  }, [])

  const fetchTesters = async () => {
    try {
      // In a real app, you would get the admin ID from auth context
      const adminId = "current-admin-id"
      const response = await fetch(`/api/testers?adminId=${adminId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch testers")
      }

      const data = await response.json()
      setTesters(data)
    } catch (err) {
      console.error("Error fetching testers:", err)
      setError("Failed to load testers. Please try again.")
    }
  }

  const handleAddTester = async () => {
    setIsLoading(true)
    setError("")

    try {
      // In a real app, you would get the admin ID from auth context
      const adminId = "current-admin-id"

      const response = await fetch("/api/testers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newTester,
          adminId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create tester")
      }

      // Refresh the testers list
      await fetchTesters()

      // Reset form and close dialog
      setNewTester({ name: "", email: "", password: "" })
      setIsAddDialogOpen(false)
    } catch (err) {
      console.error("Error adding tester:", err)
      setError(err.message || "Failed to add tester. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTester = async (id) => {
    if (!confirm("Are you sure you want to delete this tester?")) {
      return
    }

    try {
      const response = await fetch(`/api/testers/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete tester")
      }

      // Refresh the testers list
      await fetchTesters()
    } catch (err) {
      console.error("Error deleting tester:", err)
      setError("Failed to delete tester. Please try again.")
    }
  }

  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Manage Testers</h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90">
                <Plus className="mr-2 h-4 w-4" /> Add Tester
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tester</DialogTitle>
                <DialogDescription>
                  Create a new tester account. They will be able to conduct tests on the platform.
                </DialogDescription>
              </DialogHeader>
              {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                      id="name"
                      value={newTester.name}
                      onChange={(e) => setNewTester({ ...newTester, name: e.target.value })}
                      placeholder="Full Name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      value={newTester.email}
                      onChange={(e) => setNewTester({ ...newTester, email: e.target.value })}
                      placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                      id="password"
                      type="password"
                      value={newTester.password}
                      onChange={(e) => setNewTester({ ...newTester, password: e.target.value })}
                      placeholder="Create a password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                    className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                    onClick={handleAddTester}
                    disabled={!newTester.name || !newTester.email || !newTester.password || isLoading}
                >
                  {isLoading ? "Adding..." : "Add Tester"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <Card className="border-[#00D4EF]/20">
          <CardHeader>
            <CardTitle>Testers</CardTitle>
            <CardDescription>Manage your testing team members</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tests Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testers.length > 0 ? (
                    testers.map((tester) => (
                        <TableRow key={tester.id}>
                          <TableCell className="font-medium">{tester.name}</TableCell>
                          <TableCell>{tester.email}</TableCell>
                          <TableCell>{tester.tests?.length || 0}</TableCell>
                          <TableCell>
                      <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/10 text-green-500`}
                      >
                        Active
                      </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#00D4EF]">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleDeleteTester(tester.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No testers found. Add your first tester to get started.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  )
}

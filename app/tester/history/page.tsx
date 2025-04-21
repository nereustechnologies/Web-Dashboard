"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileText, Download, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function TestHistoryPage() {
  const [tests, setTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would get the tester ID from auth context
      const testerId = "current-tester-id"
      const response = await fetch(`/api/tests?testerId=${testerId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch tests")
      }

      const data = await response.json()
      setTests(data)
    } catch (err) {
      console.error("Error fetching tests:", err)
      setError("Failed to load test history. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (testId) => {
    try {
      // First, prepare the download
      await fetch(`/api/tests/${testId}/download`, {
        method: "POST",
      })

      // Then get the download URL
      const response = await fetch(`/api/tests/${testId}/download`)

      if (!response.ok) {
        throw new Error("Failed to prepare download")
      }

      const { download_url } = await response.json()

      // Open the download in a new tab
      window.open(download_url, "_blank")
    } catch (err) {
      console.error("Error downloading test data:", err)
      alert("Failed to download test data. Please try again.")
    }
  }

  const handleViewTest = (testId) => {
    // In a real app, you would navigate to a test details page
    alert(`View test details for ${testId}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Test History</h2>
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
          <CardTitle>Your Completed Tests</CardTitle>
          <CardDescription>View and download data from your previous tests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">Loading test history...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Exercises</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.length > 0 ? (
                  tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.customer?.name || "Unknown User"}</TableCell>
                      <TableCell>{new Date(test.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            test.status === "Completed"
                              ? "bg-green-500/10 text-green-500"
                              : test.status === "In Progress"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {test.status}
                        </span>
                      </TableCell>
                      <TableCell>{test.exercises?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#00D4EF]"
                          onClick={() => handleViewTest(test.id)}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        {test.status === "Completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#00D4EF]"
                            onClick={() => handleDownload(test.id)}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No test history found. Start conducting tests to see them here.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setupSupabaseTables, setupSupabaseStorage } from "@/lib/supabase-schema"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function SetupPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [setupComplete, setSetupComplete] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSetup = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Set up Supabase tables
            const tablesResult = await setupSupabaseTables()

            if (!tablesResult) {
                throw new Error("Failed to set up Supabase tables")
            }

            // Set up Supabase storage
            const storageResult = await setupSupabaseStorage()

            if (!storageResult) {
                throw new Error("Failed to set up Supabase storage")
            }

            setSetupComplete(true)
        } catch (err: any) {
            console.error("Setup error:", err)
            setError(err.message || "An error occurred during setup")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
            <Card className="w-full max-w-md border-[#00D4EF]/20">
                <CardHeader>
                    <CardTitle>Supabase Setup</CardTitle>
                    <CardDescription>Initialize the Supabase schema for the IMU testing platform</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        This will create all the necessary tables and storage buckets in your Supabase project. Make sure you have
                        the correct Supabase URL and API key set in your environment variables.
                    </p>

                    {setupComplete && (
                        <div className="flex items-center gap-2 p-4 border border-green-500/20 rounded-md bg-green-500/10 mb-4">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <p className="text-green-500">Setup completed successfully!</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-4 border border-red-500/20 rounded-md bg-red-500/10 mb-4">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <p className="text-red-500">{error}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                        onClick={handleSetup}
                        disabled={isLoading || setupComplete}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting up...
                            </>
                        ) : setupComplete ? (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Setup Complete
                            </>
                        ) : (
                            "Initialize Supabase Schema"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

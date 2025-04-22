"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NereusLogo } from "@/components/nereus-logo"
import { LogOut } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"

interface MainNavProps {
    role: "admin" | "tester"
}

export function MainNav({ role }: MainNavProps) {
    const pathname = usePathname()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const { logout } = useAuth()

    const adminLinks = [
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/testers", label: "Manage Testers" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/reports", label: "Reports" },
    ]

    const testerLinks = [
        { href: "/tester/dashboard", label: "Dashboard" },
        { href: "/tester/tests", label: "Conduct Tests" },
        { href: "/tester/history", label: "Test History" },
    ]

    const links = role === "admin" ? adminLinks : testerLinks

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            logout()
        } catch (error) {
            console.error("Logout error:", error)
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <div className="flex h-16 items-center px-4 border-b border-[#00D4EF]/20 bg-black">
            <div className="flex items-center gap-2 mr-4">
                <NereusLogo className="h-8 w-8" />
                <span className="font-bold text-lg">Nereus</span>
            </div>
            <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-[#00D4EF]",
                            pathname === link.href ? "text-[#00D4EF]" : "text-muted-foreground",
                        )}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
            <div className="ml-auto flex items-center space-x-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-[#00D4EF] hover:bg-transparent"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
            </div>
        </div>
    )
}

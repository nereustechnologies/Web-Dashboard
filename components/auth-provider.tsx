"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

// Create auth context
const AuthContext = createContext({
    user: null,
    isLoading: true,
    logout: () => {},
})

// Auth provider component
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    // Check for user on mount
    useEffect(() => {
        const checkAuth = () => {
            try {
                const userData = localStorage.getItem("user")
                if (userData) {
                    const parsedUser = JSON.parse(userData)
                    setUser(parsedUser)
                } else {
                    // If no user and not on a public route, redirect to login
                    if (!pathname.startsWith("/login") && !pathname.startsWith("/register")) {
                        router.push("/login")
                    }
                }
            } catch (error) {
                console.error("Auth error:", error)
                // On error, clear user and redirect to login
                localStorage.removeItem("user")
                if (!pathname.startsWith("/login") && !pathname.startsWith("/register")) {
                    router.push("/login")
                }
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [pathname, router])

    // Check route permissions
    useEffect(() => {
        if (!isLoading && user) {
            // Admin routes check
            if (pathname.startsWith("/admin") && user.role !== "admin") {
                router.push("/login")
            }

            // Tester routes check
            if (pathname.startsWith("/tester") && user.role !== "tester" && user.role !== "admin") {
                router.push("/login")
            }
        }
    }, [isLoading, user, pathname, router])

    // Logout function
    const logout = () => {
        localStorage.removeItem("user")
        setUser(null)
        router.push("/login")
    }

    return <AuthContext.Provider value={{ user, isLoading, logout }}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export const useAuth = () => useContext(AuthContext)

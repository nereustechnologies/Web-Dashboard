"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  // Fetch user from Supabase on mount
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (data?.user) {
        setUser(data.user)
      } else {
        setUser(null)
        if (!pathname.startsWith("/login") && !pathname.startsWith("/register")) {
          router.push("/login")
        }
      }

      setIsLoading(false)
    }

    getUser()

    // Subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        router.push("/login")
      }
    })

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [pathname, router])

  // Check route permissions
  useEffect(() => {
    if (!isLoading && user) {
      const role = user.user_metadata?.role || "tester"

      if (pathname.startsWith("/admin") && role !== "admin") {
        router.push("/login")
      }

      if (pathname.startsWith("/tester") && !["admin", "tester"].includes(role)) {
        router.push("/login")
      }
    }
  }, [isLoading, user, pathname, router])

  // Logout function
  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, isLoading, logout }}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export const useAuth = () => useContext(AuthContext)

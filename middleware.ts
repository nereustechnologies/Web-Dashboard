import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple middleware that doesn't rely on Supabase
export function middleware(request: NextRequest) {
    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/register"]
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // For API routes, allow them to handle their own auth
    if (pathname.startsWith("/api")) {
        return NextResponse.next()
    }

    // For root path, redirect to login
    if (pathname === "/") {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    // For all other routes, we'll let the client-side auth handle it
    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

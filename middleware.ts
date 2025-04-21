import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const session = request.cookies.get("session")
    const userRole = request.cookies.get("userRole")
    const { pathname } = request.nextUrl

    // Check if user is logged in
    if (!session && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    // Check admin routes
    if (pathname.startsWith("/admin") && userRole?.value !== "admin") {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    // Check tester routes
    if (pathname.startsWith("/tester") && userRole?.value !== "tester" && userRole?.value !== "admin") {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
}

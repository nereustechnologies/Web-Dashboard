import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json()
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Validate role
    if (role !== "admin" && role !== "tester") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Create user in database
    const { error: dbError } = await supabase.from("users").insert({
      id: authData.user.id,
      name,
      email,
      role,
    })

    if (dbError) {
      console.error("Error inserting user into database:", dbError)
      return NextResponse.json({ error: "Failed to create user record" }, { status: 500 })
    }

    return NextResponse.json({
      id: authData.user.id,
      email: authData.user.email,
      name,
      role,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

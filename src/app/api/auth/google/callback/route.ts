import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get("lang") || "zh-CN"

  try {
    const code = searchParams.get("code")
    
    if (!code) {
      throw new Error("No code provided")
    }

    // 获取访问令牌
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(30000),
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 获取用户信息
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const userData = await userResponse.json()
    const email = userData.email

    if (!email) {
      throw new Error("No email found")
    }

    // 检查用户是否存在
    const { data: existingUser } = await supabase
      .from("users")
      .select()
      .eq("email", email)
      .single()

    if (!existingUser) {
      // 创建新用户
      const today = new Date()
      const userCreated = today.toISOString().split("T")[0]
      const plansEnd = new Date(today.setDate(today.getDate() + 10))
        .toISOString()
        .split("T")[0]

      await supabase.from("users").insert([
        {
          email: email,
          password: "google_oauth",
          user_created: userCreated,
          plans_end: plansEnd,
        },
      ])
    }

    // 设置 cookie
    cookies().set("userEmail", encodeURIComponent(email), {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    
    // 重定向到首页
    const response = NextResponse.redirect(new URL(`/${lang}`, request.url))
    response.cookies.set("userEmail", encodeURIComponent(email), {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    })
    
    return response
  } catch (error: any) {
    console.error("Google auth error:", error)
    return NextResponse.redirect(new URL(`/${lang}/signin?error=google_auth_failed`, request.url))
  }
}
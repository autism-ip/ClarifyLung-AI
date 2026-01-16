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
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
      signal: AbortSignal.timeout(30000),
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 获取用户邮箱
    const userResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const emails = await userResponse.json()
    const primaryEmail = emails.find((email: any) => email.primary)?.email

    if (!primaryEmail) {
      throw new Error("No primary email found")
    }

    // 检查用户是否存在
    const { data: existingUser } = await supabase
      .from("users")
      .select()
      .eq("email", primaryEmail)
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
          email: primaryEmail,
          password: "github_oauth",
          user_created: userCreated,
          plans_end: plansEnd,
        },
      ])
    }

    // 在设置 cookie 之前，先清除可能存在的旧 cookie
    cookies().delete("userEmail")

    // 设置新的 cookie
    cookies().set("userEmail", encodeURIComponent(primaryEmail), {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    
    // 重定向到首页
    const response = NextResponse.redirect(new URL(`/${lang}`, request.url))
    response.cookies.set("userEmail", encodeURIComponent(primaryEmail), {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    
    return response
  } catch (error: any) {
    console.error("GitHub auth error:", error)
    return NextResponse.redirect(new URL(`/${lang}/signin?error=github_auth_failed`, request.url))
  }
}
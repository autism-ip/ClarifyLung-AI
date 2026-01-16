import { NextResponse } from "next/server"

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  
  // Google OAuth 授权地址
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback')}&response_type=code&scope=email profile&prompt=consent`

  return NextResponse.redirect(googleAuthUrl)
}
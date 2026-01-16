import { NextResponse } from "next/server"

export async function GET() {
  const githubClientId = process.env.GITHUB_CLIENT_ID
  
  // GitHub OAuth 授权地址
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email&prompt=consent`

  return NextResponse.redirect(githubAuthUrl)
}
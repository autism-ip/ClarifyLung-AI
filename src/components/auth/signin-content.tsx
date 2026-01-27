/**
 * [INPUT]: 依赖 @/components/auth/auth-form, @/i18n/get-dictionary, next/link
 * [OUTPUT]: 对外提供 SignInContent 登录内容组件
 * [POS]: components/auth/signin-content 的登录页面渲染器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { AuthForm } from "@/components/auth/auth-form"
import Link from "next/link"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"

export function SignInContent({
  lang
}: {
  lang: Locale
}) {
  const [dict, setDict] = useState<any>(null)
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  useEffect(() => {
    getDictionary(lang).then(setDict)
  }, [lang])

  useEffect(() => {
    if (error === "github_auth_failed") {
      toast.error("GitHub Signin Failed, please try again.")
    }
    if (error === "google_auth_failed") {
      toast.error("Google Signin Failed, please try again.")
    }
  }, [error])

  if (!dict) return null

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12">
      <div className="container max-w-md">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {dict.auth.signin.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {dict.auth.signin.description}
          </p>
        </div>

        {/* 登录表单 */}
        <div className="card-hover border-2 bg-card/50 backdrop-blur-sm rounded-2xl p-6">
          <AuthForm mode="signin" lang={lang} />
        </div>

        {/* 底部链接 */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {dict.auth.signin.noAccount}{" "}
          <Link
            href={`/${lang}/signup`}
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            {dict.auth.signin.signupLink}
          </Link>
        </p>
      </div>
    </div>
  )
}

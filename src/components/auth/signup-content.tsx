"use client"

import { AuthForm } from "@/components/auth/auth-form"
import Link from "next/link"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"

export function SignUpContent({
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
    <div className="container relative flex-1 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {dict.auth.signup.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dict.auth.signup.description}
          </p>
        </div>
        <AuthForm mode="signup" lang={lang} />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link 
            href={`/${lang}/signin`}
            className="hover:text-brand underline underline-offset-4"
          >
            {dict.auth.signup.hasAccount} {dict.auth.signup.signinLink}
          </Link>
        </p>
      </div>
    </div>
  )
}
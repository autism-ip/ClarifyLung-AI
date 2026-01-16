import { Suspense } from "react"
import { SignInContent } from "@/components/auth/signin-content"
import { Icons } from "@/components/icons"
import { Locale } from "@/i18n/config"

export default function SignInPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return (
    <Suspense fallback={<Icons.spinner className="mx-auto h-6 w-6 animate-spin" />}>
      <SignInContent lang={lang} />
    </Suspense>
  )
}
import { Suspense } from "react"
import { SignUpContent } from "@/components/auth/signup-content"
import { Icons } from "@/components/icons"
import { Locale } from "@/i18n/config"

export default function SignUpPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return (
    <Suspense fallback={<Icons.spinner className="mx-auto h-6 w-6 animate-spin" />}>
      <SignUpContent lang={lang} />
    </Suspense>
  )
}
import { NotFoundContent } from "@/components/not-found-content"
import { Locale } from "@/i18n/config"

export default async function NotFoundPage({
  params
}: {
  params: Promise<{ lang: Locale }> | undefined
}) {
  // not-found.tsx 的 params 可能是 undefined
  const resolvedParams = await params
  const lang = resolvedParams?.lang ?? 'en' as Locale
  return <NotFoundContent lang={lang} />
}

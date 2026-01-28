import { NotFoundContent } from "@/components/not-found-content"
import { Locale } from "@/i18n/config"

export default async function NotFoundPage({
  params
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang } = await params
  return <NotFoundContent lang={lang} />
}

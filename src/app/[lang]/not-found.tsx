import { NotFoundContent } from "@/components/not-found-content"
import { Locale } from "@/i18n/config"

export default function NotFoundPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return <NotFoundContent lang={lang} />
}

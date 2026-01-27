import dynamic from 'next/dynamic'
import type { Locale } from '@/i18n/config'

const ProfileClient = dynamic(() => import('./profile-client'), {
  ssr: false,
  loading: () => (
    <div className="container py-12 flex justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
})

export default function ProfilePage({
  params
}: {
  params: { lang: Locale }
}) {
  return <ProfileClient lang={params.lang} />
}

"use client"

import { usePathname, useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  const switchLanguage = (locale: Locale) => {
    const newPathname = pathname.replace(/^\/[^\/]+/, `/${locale}`)
    router.push(newPathname)
  }

  const currentLocale = pathname.split('/')[1] as Locale

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {localeNames[currentLocale]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLanguage(locale)}
          >
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

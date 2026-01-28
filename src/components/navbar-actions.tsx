"use client"

import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { UserNav } from "./user-nav"
import { Button } from "./ui/button"
import Link from "next/link"
import type { Locale } from "@/i18n/config"
import { useAuth } from "@/hooks"

interface NavbarActionsProps {
  lang: Locale
  dict: any
}

export function NavbarActions({ lang, dict }: NavbarActionsProps) {
  const { isAuthenticated, isLoading, logout } = useAuth({ lang, redirectTo: `/${lang}/signin` })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <LanguageSwitcher />
      {isAuthenticated ? (
        <UserNav lang={lang} dict={dict} onLogout={logout} />
      ) : (
        <Link href={`/${lang}/signin`}>
          <Button variant="ghost" size="sm">{dict.nav.signin}</Button>
        </Link>
      )}
    </div>
  )
}

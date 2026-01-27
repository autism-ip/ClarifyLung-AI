/**
 * [INPUT]: 依赖 @/components/ui/button, lucide-react, next/link, @/hooks/use-auth
 * [OUTPUT]: 对外提供 BottomNav 底部导航栏组件
 * [POS]: components/bottom-nav 的移动端底部固定导航
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { Home, FileText, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Locale } from "@/i18n/config"
import { useAuth } from "@/hooks"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  lang: Locale
  dict: {
    nav: {
      features?: string
      demo?: string
      docs?: string
      profile?: string
      signin?: string
    }
  }
}

export function BottomNav({ lang, dict }: BottomNavProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth({ lang })

  const navItems = [
    {
      href: `/${lang}`,
      label: dict.nav.features || "Home",
      icon: Home,
      exact: true,
    },
    {
      href: `/${lang}/doc`,
      label: dict.nav.docs || "Docs",
      icon: FileText,
    },
    {
      href: `/${lang}/demo`,
      label: dict.nav.demo || "Demo",
      icon: Sparkles,
    },
    {
      href: isAuthenticated ? `/${lang}/profile` : `/${lang}/signin`,
      label: isAuthenticated
        ? (dict.nav.profile || "Profile")
        : (dict.nav.signin || "Sign In"),
      icon: User,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* 背景模糊遮罩 */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t" />

      {/* 导航项 */}
      <nav className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="sr-only">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * [INPUT]: 依赖 @/components/ui/sheet, lucide-react, next/link
 * [OUTPUT]: 对外提供 MobileNav 移动端导航组件
 * [POS]: components/mobile-nav 的移动端抽屉导航
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { Menu, FileText, Sparkles, User, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import Link from "next/link"
import type { Locale } from "@/i18n/config"
import { useAuth } from "@/hooks"

interface MobileNavProps {
  lang: Locale
  dict: any
}

export function MobileNav({ lang, dict }: MobileNavProps) {
  const { isAuthenticated } = useAuth({ lang })

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10 touch-manipulation"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">切换菜单</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] pr-4">
        {/* Logo 区域 */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{dict.common.brand}</span>
        </div>

        {/* 导航链接 */}
        <nav className="flex flex-col space-y-1 mt-6">
          <Link
            href={`/${lang}/doc`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-muted touch-manipulation"
          >
            <FileText className="h-5 w-5" />
            {dict.nav.docs}
          </Link>
          <Link
            href={`/${lang}/demo`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-muted touch-manipulation"
          >
            <Sparkles className="h-5 w-5" />
            {dict.nav.demo}
          </Link>
        </nav>

        {/* 分隔线 */}
        <div className="h-px bg-border my-4" />

        {/* 用户操作 */}
        <div className="flex flex-col space-y-2">
          {isAuthenticated ? (
            <Link
              href={`/${lang}/profile`}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-muted touch-manipulation"
            >
              <User className="h-5 w-5" />
              {dict.nav.profile || "Profile"}
            </Link>
          ) : (
            <>
              <Link
                href={`/${lang}/signin`}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-muted touch-manipulation"
              >
                <LogIn className="h-5 w-5" />
                {dict.nav.signin || "Sign In"}
              </Link>
              <Link
                href={`/${lang}/signup`}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground transition-colors hover:bg-primary/90 touch-manipulation"
              >
                <User className="h-5 w-5" />
                {dict.nav.signup || "Sign Up"}
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

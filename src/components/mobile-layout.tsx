/**
 * [INPUT]: 依赖 @/components/bottom-nav, next/navigation
 * [OUTPUT]: 对外提供 MobileLayout 移动端布局组件
 * [POS]: components/mobile-layout 的移动端底部导航包装
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { BottomNav } from "@/components/bottom-nav"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

interface MobileLayoutProps {
  children: React.ReactNode
  lang: string
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

export function MobileLayout({ children, lang, dict }: MobileLayoutProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 隐藏底部导航的路由
  const hideBottomNav = ["/signin", "/signup"].some((path) =>
    pathname.includes(path)
  )

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      {!hideBottomNav && <BottomNav lang={lang as any} dict={dict} />}
    </>
  )
}

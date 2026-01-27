/**
 * [INPUT]: 依赖 @/components/ui/button, next/link, lucide-react
 * [OUTPUT]: 对外提供 NotFoundContent 404 页面组件
 * [POS]: app/[lang]/not-found 的内容渲染器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { Button } from "@/components/ui/button"
import { Home, Search, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useDictionary } from "@/hooks"
import type { Locale } from "@/i18n/config"

export function NotFoundContent({
  lang
}: {
  lang: Locale
}) {
  const { dictionary: dict } = useDictionary(lang)

  const notFoundDict = (dict as Record<string, any>)?.notFound || {
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist or has been moved.",
    goBack: "Go Back",
    goHome: "Back to Home",
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="container max-w-md text-center py-12">
        {/* 404 数字 */}
        <div className="mb-8 relative">
          <h1 className="text-[120px] font-bold leading-none tracking-tighter text-primary/20 font-display">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Search className="h-10 w-10 text-primary" />
            </div>
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          {notFoundDict.title}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {notFoundDict.description}
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {notFoundDict.goBack}
          </Button>
          <Button asChild>
            <Link href={`/${lang}`}>
              <Home className="mr-2 h-4 w-4" />
              {notFoundDict.goHome}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

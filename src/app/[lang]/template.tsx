/**
 * [INPUT]: 依赖 @/components/page-transition
 * [OUTPUT]: 对外提供页面模板，应用页面过渡动画
 * [POS]: app/[lang]/ 的模板文件，控制页面切换动画
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { PageTransition } from "@/components/page-transition"
import { ReactNode } from "react"

export default function Template({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  )
}

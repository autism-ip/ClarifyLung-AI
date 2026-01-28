/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供页面模板
 * [POS]: app/[lang]/ 的模板文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ReactNode } from "react"

export default function Template({ children }: { children: ReactNode }) {
  return children
}

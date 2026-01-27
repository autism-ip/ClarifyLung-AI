/**
 * [INPUT]: 依赖 react, @/lib/utils
 * [OUTPUT]: 对外提供 PageTransition 页面过渡包装组件
 * [POS]: components/page-transition 的核心组件，用于页面切换动画
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * 渐入效果
 */
export function FadeIn({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}

/**
 * 滑入效果
 */
export function SlideIn({
  children,
  direction = "up",
  delay = 0
}: {
  children: ReactNode
  direction?: "up" | "down" | "left" | "right"
  delay?: number
}) {
  const variants = {
    up: { from: { y: 20, opacity: 0 }, to: { y: 0, opacity: 1 } },
    down: { from: { y: -20, opacity: 0 }, to: { y: 0, opacity: 1 } },
    left: { from: { x: -20, opacity: 0 }, to: { x: 0, opacity: 1 } },
    right: { from: { x: 20, opacity: 0 }, to: { x: 0, opacity: 1 } },
  }

  return (
    <motion.div
      initial="from"
      animate="to"
      variants={variants[direction]}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/**
 * 缩放效果
 */
export function ScaleIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

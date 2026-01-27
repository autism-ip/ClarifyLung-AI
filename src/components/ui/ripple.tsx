/**
 * [INPUT]: 依赖 react, @/lib/utils
 * [OUTPUT]: 对外提供 useRipple hook 和 Ripple 组件
 * [POS]: components/ui/ripple 的交互核心，用于按钮点击反馈
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface RippleProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger?: boolean
}

interface Ripple {
  id: number
  x: number
  y: number
}

export function Ripple({
  trigger = true,
  className,
  ...props
}: RippleProps) {
  const [ripples, setRipples] = React.useState<Ripple[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!trigger) {
      setRipples([])
      return
    }

    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newRipple: Ripple = {
        id: Date.now(),
        x,
        y,
      }

      setRipples(prev => [...prev, newRipple])

      // 动画结束后移除
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)
    }

    container.addEventListener("click", handleClick)
    return () => {
      container.removeEventListener("click", handleClick)
    }
  }, [trigger])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50,
          }}
        />
      ))}
      {props.children}
    </div>
  )
}

/**
 * 带波纹效果的按钮包装
 */
export function RippleButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Ripple className="w-full h-full">
      <button
        className={cn("relative w-full h-full", className)}
        {...props}
      >
        {children}
      </button>
    </Ripple>
  )
}

/**
 * [INPUT]: 依赖 react, @/lib/utils
 * [OUTPUT]: 对外提供 Skeleton 组件及变体
 * [POS]: components/ui/skeleton 的基础加载占位组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * 卡片骨架屏
 */
function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

/**
 * 文本骨架屏
 */
function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && i > 0 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

/**
 * 头像骨架屏
 */
function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }
  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />
}

/**
 * 统计数字骨架屏
 */
function SkeletonStats() {
  return (
    <div className="text-center space-y-2">
      <Skeleton className="h-8 w-16 mx-auto" />
      <Skeleton className="h-4 w-20 mx-auto" />
    </div>
  )
}

/**
 * 图片骨架屏
 */
function SkeletonImage({ aspect = "square" }: { aspect?: "square" | "video" }) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
  }
  return <Skeleton className={cn(aspectClasses[aspect], "w-full rounded-lg")} />
}

/**
 * 上传区域骨架屏
 */
function SkeletonUpload() {
  return (
    <div className="border-2 border-dashed rounded-xl p-8 space-y-4">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonAvatar,
  SkeletonStats,
  SkeletonImage,
  SkeletonUpload,
}

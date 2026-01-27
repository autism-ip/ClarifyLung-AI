/**
 * [INPUT]: 依赖 react, lucide-react 图标, @/components/ui/button
 * [OUTPUT]: 对外提供 EmptyState 空状态组件
 * [POS]: components/empty-state 的通用空状态组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { Button } from "@/components/ui/button"
import { Upload, Search, FileX, Inbox, RefreshCw, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface EmptyStateProps {
  icon?: "upload" | "search" | "file" | "inbox" | "refresh" | "custom"
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  customIcon?: ReactNode
  className?: string
}

const iconMap = {
  upload: Upload,
  search: Search,
  file: FileX,
  inbox: Inbox,
  refresh: RefreshCw,
  custom: null,
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  secondaryAction,
  customIcon,
  className,
}: EmptyStateProps) {
  const IconComponent = iconMap[icon] || Inbox

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      {/* 图标容器 */}
      <div className="mb-6 relative">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
          {customIcon || <IconComponent className="h-10 w-10 text-muted-foreground" />}
        </div>
        {/* 装饰性光晕 */}
        <div className="absolute inset-0 -z-10 bg-primary/5 rounded-full blur-2xl transform scale-110" />
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {/* 描述 */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 上传前空状态
 */
export function EmptyUpload({
  onUpload,
  className,
}: {
  onUpload?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon="upload"
      title="Upload an Image"
      description="Drag and drop a lung X-ray image, or click to select"
      action={
        onUpload
          ? {
              label: "Select Image",
              onClick: onUpload,
            }
          : undefined
      }
      className={className}
    />
  )
}

/**
 * 无结果空状态
 */
export function EmptySearch({
  onClear,
  className,
}: {
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon="search"
      title="No Results Found"
      description="Try adjusting your search or filter to find what you're looking for"
      action={
        onClear
          ? {
              label: "Clear Search",
              onClick: onClear,
            }
          : undefined
      }
      className={className}
    />
  )
}

/**
 * 无数据空状态
 */
export function EmptyData({
  onRefresh,
  className,
}: {
  onRefresh?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon="inbox"
      title="No Data Yet"
      description="Start by uploading your first image for analysis"
      action={
        onRefresh
          ? {
              label: "Refresh",
              onClick: onRefresh,
            }
          : undefined
      }
      className={className}
    />
  )
}

/**
 * 无历史记录空状态
 */
export function EmptyHistory({
  onGoDemo,
  className,
}: {
  onGoDemo?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon="file"
      title="No Analysis History"
      description="Your previous analysis results will appear here"
      action={
        onGoDemo
          ? {
              label: "Start Analysis",
              onClick: onGoDemo,
            }
          : undefined
      }
      className={className}
    />
  )
}

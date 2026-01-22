/**
 * 简单的内存速率限制器
 * 生产环境建议使用 Redis 实现
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// 内存存储（生产环境应使用 Redis）
const rateLimitStore = new Map<string, RateLimitEntry>()

// 清理过期条目
function cleanupExpiredEntries() {
  const now = Date.now()
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  })
}

// 每分钟清理一次
setInterval(cleanupExpiredEntries, 60 * 1000)

export interface RateLimitConfig {
  /** 时间窗口内允许的最大请求数 */
  maxRequests: number
  /** 时间窗口（毫秒） */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * 检查速率限制
 * @param identifier 用户标识（如 email 或 IP）
 * @param config 速率限制配置
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier

  let entry = rateLimitStore.get(key)

  // 如果没有记录或已过期，创建新记录
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    }
  }

  // 检查是否超过限制
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  // 增加计数
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * 预定义的速率限制配置
 */
export const RATE_LIMITS = {
  // 推理 API：每分钟 10 次请求
  inference: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  // 历史记录 API：每分钟 30 次请求
  history: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  // 删除操作：每分钟 5 次请求
  delete: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
} as const

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Locale } from '@/i18n/config'

interface User {
  email: string
  user_created?: string
  plans_end?: string
}

interface UseAuthOptions {
  redirectTo?: string | null
  lang?: Locale
}

interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
  refreshUser: () => void
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  // 确保 options 是有效对象
  const safeOptions: UseAuthOptions = options || {}
  const { redirectTo, lang } = safeOptions

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 计算默认重定向路径
  const computedRedirectTo = redirectTo ?? (lang ? `/${lang}/signin` : null)

  const getUserFromCookie = useCallback((): User | null => {
    if (typeof document === 'undefined') return null

    const userEmail = decodeURIComponent(
      document.cookie
        .split('; ')
        .find(row => row.startsWith('userEmail='))
        ?.split('=')[1] || ''
    )

    if (!userEmail) return null

    return { email: userEmail }
  }, [])

  const refreshUser = useCallback(() => {
    const userData = getUserFromCookie()

    if (userData) {
      setUser(userData)
      setIsLoading(false)
    } else {
      setUser(null)
      setIsLoading(false)

      if (computedRedirectTo) {
        router.push(computedRedirectTo)
      }
    }
  }, [getUserFromCookie, computedRedirectTo, router])

  const logout = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.cookie = 'userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    }
    window.dispatchEvent(new Event('loginStateChange'))
    router.refresh()
    if (lang) {
      router.push(`/${lang}`)
    }
  }, [lang, router])

  useEffect(() => {
    // Skip if lang is not available (during SSR/pre-rendering)
    if (!lang) {
      setIsLoading(false)
      return
    }

    refreshUser()

    const handleStorageChange = () => refreshUser()

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('loginStateChange', handleStorageChange)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('loginStateChange', handleStorageChange)
      }
    }
  }, [refreshUser, lang])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshUser
  }
}

// Check if user is authenticated (can be used in server components)
export function checkAuth(): { email: string | null; isAuthenticated: boolean } {
  if (typeof window === 'undefined') {
    return { email: null, isAuthenticated: false }
  }

  const userEmail = decodeURIComponent(
    document.cookie
      .split('; ')
      .find(row => row.startsWith('userEmail='))
      ?.split('=')[1] || ''
  )

  return {
    email: userEmail || null,
    isAuthenticated: !!userEmail
  }
}

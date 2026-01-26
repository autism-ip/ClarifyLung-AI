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
  lang: Locale
}

interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
  refreshUser: () => void
}

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { redirectTo = `/${options.lang}/signin` } = options
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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

      if (redirectTo) {
        router.push(redirectTo)
      }
    }
  }, [getUserFromCookie, redirectTo, router])

  const logout = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.cookie = 'userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    }
    window.dispatchEvent(new Event('loginStateChange'))
    router.refresh()
    router.push(`/${options.lang}`)
  }, [options.lang, router])

  useEffect(() => {
    refreshUser()

    const handleStorageChange = () => refreshUser()

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('loginStateChange', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('loginStateChange', handleStorageChange)
    }
  }, [refreshUser])

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

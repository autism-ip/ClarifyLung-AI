import { useState, useEffect, useCallback } from 'react'
import { getDictionary } from '@/i18n/get-dictionary'
import type { Locale } from '@/i18n/config'

// 使用更宽松的类型，避免与实际 JSON 结构不匹配
interface Dictionary {
  metadata: {
    title: string
    description: string
    keywords: string[]
  }
  common: {
    brand: string
  }
  nav: {
    docs: string
    demo: string
    signin: string
    signout: string
    profile: string
  }
  home: {
    hero: {
      title: string
      description: string
      learnMore: string
      watchDemo: string
    }
  }
  features: {
    title: string
    description: string
    [key: string]: any
  }
  demo: {
    badge?: string
    title?: string
    description?: string
    upload?: {
      title?: string
      description?: string
      dragDrop?: string
      formats?: string
      analyzing?: string
      analyze?: string
      reset?: string
    }
    result?: {
      title?: string
      description?: string
      classification?: string
      confidence?: string
      labels?: Record<string, string>
      visualization?: string
      placeholder?: string
      processingTime?: string
    }
    instructions?: {
      title?: string
      steps?: Array<{ title: string; description: string }>
    }
    errors?: {
      invalidFile?: string
      fileTooLarge?: string
      rateLimited?: string
      inferenceError?: string
    }
    unauthorized?: {
      title?: string
      description?: string
      signin?: string
    }
    imageAlt?: {
      preview?: string
      gradcam?: string
      attention?: string
    }
  }
  doc: {
    title: string
    description: string
    loadMore: string
    documents: Array<{
      id: string
      slug: string
      title: string
      date: string
      readTime: string
      description: string
    }>
  }
  auth: {
    signin: {
      submitButton: string
      success?: string
      error?: string
      errors?: {
        userNotFound?: string
        wrongPassword?: string
      }
    }
    signup: {
      submitButton: string
      success?: string
      error?: string
      errors?: {
        emailExists?: string
      }
    }
    form: {
      email: string
      emailPlaceholder: string
      password: string
      errors?: {
        emailRequired?: string
        passwordRequired?: string
      }
      forgotPassword: string
      continueWith: string
    }
  }
  footer: {
    social: string
    support: string
    copyright: string
    links: {
      twitter: string
      github: string
      jike: string
      xhs: string
      help: string
      contact: string
      feedback: string
    }
  }
  profile: {
    title: string
    description: string
    stats: {
      inferenceCount: string
      memberSince: string
      planEnds: string
    }
    history: {
      title: string
      empty: string
      columns: {
        date: string
        image: string
        result: string
        confidence: string
        actions: string
      }
    }
    tabs: {
      overview: string
      history: string
      settings: string
    }
  }
  notFound?: {
    title: string
    description: string
    goBack: string
    goHome: string
  }
}

interface UseDictionaryOptions {
  enabled?: boolean
}

export function useDictionary(lang: Locale, options: UseDictionaryOptions = {}) {
  const { enabled = true } = options
  const [dictionary, setDictionary] = useState<Dictionary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const dict = await getDictionary(lang)
      // 使用部分类型断言，避免与实际 JSON 结构不匹配
      setDictionary(dict as unknown as Dictionary)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [lang, enabled])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    dictionary,
    loading,
    error,
    refetch
  }
}

// For use in server components
export async function loadDictionary(lang: Locale): Promise<Dictionary> {
  const dict = await getDictionary(lang)
  return dict as unknown as Dictionary
}

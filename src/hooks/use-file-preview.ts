import { useState, useCallback, useEffect } from 'react'

interface UseFilePreviewOptions {
  maxSize?: number // in bytes, default 10MB
  acceptedTypes?: string[]
}

interface UseFilePreviewReturn {
  file: File | null
  previewUrl: string | null
  error: string | null
  isValid: boolean
  selectFile: (file: File) => void
  clearFile: () => void
  reset: () => void
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

export function useFilePreview(options: UseFilePreviewOptions = {}): UseFilePreviewReturn {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES
  } = options

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`
    }
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
    }
    return null
  }, [acceptedTypes, maxSize])

  const selectFile = useCallback((newFile: File) => {
    // Revoke previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const validationError = validateFile(newFile)
    if (validationError) {
      setError(validationError)
      setFile(null)
      setPreviewUrl(null)
      return
    }

    setError(null)
    setFile(newFile)
    setPreviewUrl(URL.createObjectURL(newFile))
  }, [previewUrl, validateFile])

  const clearFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setPreviewUrl(null)
    setError(null)
  }, [previewUrl])

  const reset = useCallback(() => {
    clearFile()
  }, [clearFile])

  return {
    file,
    previewUrl,
    error,
    isValid: !!file && !error,
    selectFile,
    clearFile,
    reset
  }
}

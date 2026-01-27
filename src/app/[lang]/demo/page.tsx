'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, Loader2, AlertCircle, CheckCircle2, XCircle, ImageIcon, Zap, Shield, Clock, FileUp, Lock } from "lucide-react"
import type { Locale } from "@/i18n/config"
import { Icons } from "@/components/icons"
import { useDictionary, useFilePreview } from '@/hooks'
import Link from 'next/link'

// 延迟加载 useAuth 以避免预渲染问题
function useAuthHook() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true
  })

  useEffect(() => {
    // 在客户端检查认证状态
    if (typeof window !== 'undefined') {
      const userEmail = decodeURIComponent(
        document.cookie
          .split('; ')
          .find(row => row.startsWith('userEmail='))
          ?.split('=')[1] || ''
      )
      setAuthState({
        isAuthenticated: !!userEmail,
        isLoading: false
      })
    }
  }, [])

  return authState
}

interface InferenceResult {
  classification: string
  confidence: number
  probabilities: {
    normal: number
    benign: number
    malignant: number
  }
  gradcam_url: string | null
  attention_url: string | null
  processingTime?: number
}

interface ClassificationStyle {
  color: string
  bg: string
  border: string
  badge: string
  icon: React.ComponentType<{ className?: string }>
}

export default function DemoPage({
  params
}: {
  params: { lang: Locale }
}) {
  const { dictionary: dict, loading: dictLoading } = useDictionary(params.lang)
  const { isAuthenticated, isLoading: authLoading } = useAuthHook()
  const {
    file: selectedImage,
    previewUrl,
    error: fileError,
    isValid,
    selectFile,
    clearFile
  } = useFilePreview({
    maxSize: 10 * 1024 * 1024,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/jpg']
  })

  const [result, setResult] = useState<InferenceResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [analyzingProgress, setAnalyzingProgress] = useState(0)

  const loading = dictLoading || authLoading

  const handleReset = useCallback(() => {
    clearFile()
    setResult(null)
    setUploadError(null)
    setAnalyzingProgress(0)
  }, [clearFile])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0])
    }
  }, [selectFile])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      selectFile(file)
    }
  }, [selectFile])

  const handleSubmit = useCallback(async () => {
    if (!selectedImage || !dict) return

    setUploading(true)
    setUploadError(null)
    setAnalyzingProgress(0)

    // 模拟进度
    const progressInterval = setInterval(() => {
      setAnalyzingProgress(prev => Math.min(prev + Math.random() * 15, 85))
    }, 200)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)

      const response = await fetch('/api/inference', {
        method: 'POST',
        body: formData,
      })

      if (response.status === 429) {
        const data = await response.json()
        const errorMessage = dict.demo?.errors?.rateLimited?.replace('{seconds}', String(data.retryAfter))
          || `Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`
        setUploadError(errorMessage)
        clearInterval(progressInterval)
        return
      }

      if (!response.ok) {
        throw new Error('Inference request failed')
      }

      const data = await response.json()

      // 完成进度
      clearInterval(progressInterval)
      setAnalyzingProgress(100)

      setTimeout(() => {
        setResult(data)
      }, 300)
    } catch (err) {
      clearInterval(progressInterval)
      const errorMessage = dict.demo?.errors?.inferenceError || 'An error occurred during analysis'
      setUploadError(errorMessage)
      console.error('Inference error:', err)
    } finally {
      setUploading(false)
    }
  }, [selectedImage, dict])

  const getClassificationStyle = useCallback((classification: string): ClassificationStyle => {
    const normalized = classification.toLowerCase()
    switch (normalized) {
      case 'normal':
        return {
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          border: 'border-emerald-500/30',
          badge: 'bg-emerald-500 text-white',
          icon: CheckCircle2
        }
      case 'benign':
        return {
          color: 'text-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20',
          border: 'border-amber-500/30',
          badge: 'bg-amber-500 text-white',
          icon: AlertCircle
        }
      case 'malignant':
        return {
          color: 'text-rose-500',
          bg: 'bg-rose-500/10 border-rose-500/20',
          border: 'border-rose-500/30',
          badge: 'bg-rose-500 text-white',
          icon: XCircle
        }
      default:
        return {
          color: 'text-gray-500',
          bg: 'bg-gray-500/10 border-gray-500/20',
          border: 'border-gray-500/30',
          badge: 'bg-gray-500 text-white',
          icon: AlertCircle
        }
    }
  }, [])

  const error = fileError || uploadError

  const instructions = useMemo(() => {
    if (!dict?.demo?.instructions?.steps) {
      return [
        { title: 'Upload Image', description: 'Select or drag a clear lung X-ray image' },
        { title: 'AI Analysis', description: 'The model will automatically extract features and perform classification' },
        { title: 'View Results', description: 'Get classification results, confidence scores and heatmap visualization' },
      ]
    }
    return dict.demo.instructions.steps
  }, [dict])

  if (loading || !dict) {
    return (
      <div className="container py-12 flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {dict.demo?.unauthorized?.title || 'Login Required'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {dict.demo?.unauthorized?.description || 'Please sign in to access the AI diagnosis demo'}
          </p>
          <Button asChild size="lg">
            <Link href={`/${params.lang}/signin`}>
              {dict.demo?.unauthorized?.signin || 'Sign In'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container py-12 md:py-16 lg:py-20">
        {/* 页面标题 */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-primary/5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {dict.demo?.badge || 'AI-Powered Diagnosis'}
          </div>
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            {dict.demo?.title || 'Lung Cancer X-Ray Detection Demo'}
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-lg lg:text-xl">
            {dict.demo?.description || 'Upload a lung X-ray image to experience the intelligent diagnosis capability'}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* 左侧：上传区域 */}
          <Card className="relative overflow-hidden border-2 card-hover">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                {dict.demo?.upload?.title || 'Upload Image'}
              </CardTitle>
              <CardDescription>
                {dict.demo?.upload?.description || 'Supports JPG, PNG formats, max 10MB'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 上传区域 */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                  dragActive
                    ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-muted shadow-inner ring-2 ring-primary/10">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      {/* 图片上的状态标签 */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready
                      </div>
                    </div>
                    <p className="text-sm text-center text-muted-foreground truncate font-medium">
                      {selectedImage?.name}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className={`rounded-2xl p-5 mb-4 transition-all duration-300 ${dragActive ? 'bg-primary/15 scale-110' : 'bg-muted'}`}>
                      <FileUp className={`h-10 w-10 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <p className="text-sm text-muted-foreground text-center mb-2 font-medium">
                      {dict.demo?.upload?.dragDrop || 'Drag and drop an image here, or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {dict.demo?.upload?.formats || 'Supports JPG, PNG, JPEG formats'}
                    </p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-fade-in-up">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || uploading}
                  className="flex-1 h-12 text-base font-medium"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {dict.demo?.upload?.analyzing || 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      {dict.demo?.upload?.analyze || 'Start Analysis'}
                    </>
                  )}
                </Button>
                {selectedImage && (
                  <Button variant="outline" onClick={handleReset} size="lg" className="h-12">
                    {dict.demo?.upload?.reset || 'Reset'}
                  </Button>
                )}
              </div>

              {/* 分析进度 */}
              {uploading && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Analyzing image...</span>
                    <span className="font-medium text-primary">{analyzingProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={analyzingProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：结果展示 */}
          <Card className="relative overflow-hidden border-2 card-hover">
            <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                {dict.demo?.result?.title || 'Detection Results'}
              </CardTitle>
              <CardDescription>
                {dict.demo?.result?.description || 'AI model analysis results and explainability visualization'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6 animate-fade-in-up">
                  {/* 分类结果 */}
                  {(() => {
                    const style = getClassificationStyle(result.classification)
                    const Icon = style.icon
                    const labels = dict.demo?.result?.labels || {}
                    return (
                      <div className={`p-5 rounded-xl border ${style.bg} ${style.border}`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${style.badge} bg-opacity-15`}>
                            <Icon className={`h-8 w-8 ${style.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground font-medium">
                              {dict.demo?.result?.classification || 'Classification'}
                            </p>
                            <p className={`text-3xl font-bold ${style.color}`}>
                              {labels[result.classification.toLowerCase()] || result.classification}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <p className={`text-2xl font-bold ${style.color}`}>
                              {(result.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        {result.processingTime && (
                          <div className="mt-4 pt-4 border-t border-current/10 flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {dict.demo?.result?.processingTime || 'Processing Time'}: {result.processingTime}ms
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* 置信度分布 */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      {dict.demo?.result?.confidence || 'Confidence Distribution'}
                    </p>
                    <div className="space-y-4">
                      {Object.entries(result.probabilities).map(([key, value]) => {
                        const barColor = key === 'normal'
                          ? 'from-emerald-400 to-emerald-500'
                          : key === 'benign'
                            ? 'from-amber-400 to-amber-500'
                            : 'from-rose-400 to-rose-500'

                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium capitalize">
                                {dict.demo?.result?.labels?.[key] || key}
                              </span>
                              <span className="font-bold">{(value * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${barColor}`}
                                style={{ width: `${value * 100}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 可视化结果 */}
                  {(result.gradcam_url || result.attention_url) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-4">
                        {dict.demo?.result?.visualization || 'Visual Analysis'}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {result.gradcam_url && (
                          <div className="space-y-2">
                            <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-inner border ring-1 ring-primary/10">
                              <img src={result.gradcam_url} alt="Grad-CAM++" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-medium">Grad-CAM++</p>
                          </div>
                        )}
                        {result.attention_url && (
                          <div className="space-y-2">
                            <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-inner border ring-1 ring-primary/10">
                              <img src={result.attention_url} alt="Attention Map" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-medium">Attention Map</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                  <div className="rounded-2xl bg-muted p-6 mb-4">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground max-w-sm">
                    {dict.demo?.result?.placeholder || 'Analysis results will be displayed here after uploading an image'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card className="mt-8 max-w-6xl mx-auto border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              {dict.demo?.instructions?.title || 'Instructions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {instructions.map((step, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 card-hover"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-lg">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, AlertCircle, CheckCircle2, XCircle, ImageIcon, Zap, Shield, Clock } from "lucide-react"
import type { Locale } from "@/i18n/config"
import { getDictionary } from "@/i18n/get-dictionary"
import { Icons } from "@/components/icons"

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

export default function DemoPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  const [dict, setDict] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  // 检查登录状态 & 加载字典
  useEffect(() => {
    getDictionary(lang).then(setDict)
    
    const userEmail = decodeURIComponent(document.cookie
      .split('; ')
      .find(row => row.startsWith('userEmail='))
      ?.split('=')[1] || '')
    
    if (!userEmail) {
      router.push(`/${lang}/signin`)
      return
    }
    setLoading(false)
  }, [lang, router])

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(dict?.demo?.errors?.invalidFile || 'Please select an image file')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError(dict?.demo?.errors?.fileTooLarge || 'File size must be less than 10MB')
      return
    }

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
    setError(null)
  }, [dict])

  // 拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  // 提交推理请求
  const handleSubmit = async () => {
    if (!selectedImage) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)

      const response = await fetch('/api/inference', {
        method: 'POST',
        body: formData,
      })

      if (response.status === 429) {
        const data = await response.json()
        setError(dict?.demo?.errors?.rateLimited?.replace('{seconds}', data.retryAfter) || 
          `Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`)
        return
      }

      if (!response.ok) {
        throw new Error('Inference request failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(dict?.demo?.errors?.inferenceError || 'An error occurred during analysis')
      console.error('Inference error:', err)
    } finally {
      setUploading(false)
    }
  }

  // 重置状态
  const handleReset = () => {
    setSelectedImage(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
  }

  // 获取分类对应的样式和图标
  const getClassificationStyle = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'normal':
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 }
      case 'benign':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertCircle }
      case 'malignant':
        return { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: XCircle }
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: AlertCircle }
    }
  }

  if (loading || !dict) {
    return (
      <div className="container py-12 flex justify-center items-center min-h-[60vh]">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container py-12 md:py-16 lg:py-20">
        {/* 页面标题 */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-primary/5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
          <Card className="relative overflow-hidden border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
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
                    <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-muted shadow-inner">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm text-center text-muted-foreground truncate">
                      {selectedImage?.name}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="rounded-full bg-muted p-4 mb-4 shadow-inner">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center mb-2">
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
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedImage || uploading}
                  className="flex-1 h-12 text-base"
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
            </CardContent>
          </Card>

          {/* 右侧：结果展示 */}
          <Card className="relative overflow-hidden border-2">
            <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle>{dict.demo?.result?.title || 'Detection Results'}</CardTitle>
              <CardDescription>
                {dict.demo?.result?.description || 'AI model analysis results and explainability visualization'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  {/* 分类结果 */}
                  <div className={`p-5 rounded-xl border ${getClassificationStyle(result.classification).bg} ${getClassificationStyle(result.classification).border}`}>
                    <div className="flex items-center gap-4">
                      {(() => {
                        const Icon = getClassificationStyle(result.classification).icon
                        return <Icon className={`h-10 w-10 ${getClassificationStyle(result.classification).color}`} />
                      })()}
                      <div>
                        <p className="text-sm text-muted-foreground">{dict.demo?.result?.classification || 'Classification'}</p>
                        <p className={`text-3xl font-bold ${getClassificationStyle(result.classification).color}`}>
                          {dict.demo?.result?.labels?.[result.classification.toLowerCase()] || result.classification}
                        </p>
                      </div>
                    </div>
                    {result.processingTime && (
                      <div className="mt-3 pt-3 border-t border-current/10 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {dict.demo?.result?.processingTime || 'Processing Time'}: {result.processingTime}ms
                      </div>
                    )}
                  </div>

                  {/* 置信度 */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-4">{dict.demo?.result?.confidence || 'Confidence Distribution'}</p>
                    <div className="space-y-4">
                      {Object.entries(result.probabilities).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{dict.demo?.result?.labels?.[key] || key}</span>
                            <span className="font-bold">{(value * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                key === 'normal' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                key === 'benign' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                                'bg-gradient-to-r from-rose-400 to-rose-500'
                              }`}
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 可视化结果 */}
                  {(result.gradcam_url || result.attention_url) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-4">{dict.demo?.result?.visualization || 'Visual Analysis'}</p>
                      <div className="grid grid-cols-2 gap-4">
                        {result.gradcam_url && (
                          <div className="space-y-2">
                            <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-inner border">
                              <img src={result.gradcam_url} alt="Grad-CAM++" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-medium">Grad-CAM++</p>
                          </div>
                        )}
                        {result.attention_url && (
                          <div className="space-y-2">
                            <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-inner border">
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
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4 shadow-inner">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground">
                    {dict.demo?.result?.placeholder || 'Analysis results will be displayed here after uploading an image'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card className="mt-8 max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {dict.demo?.instructions?.title || 'Instructions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {(dict.demo?.instructions?.steps || [
                { title: 'Upload Image', description: 'Select or drag a clear lung X-ray image' },
                { title: 'AI Analysis', description: 'The model will automatically extract features and perform classification' },
                { title: 'View Results', description: 'Get classification results, confidence scores and heatmap visualization' },
              ]).map((step: any, index: number) => (
                <div key={index} className="flex gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-lg">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
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

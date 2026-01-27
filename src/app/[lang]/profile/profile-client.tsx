'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  User, CreditCard, Settings, History, Trash2, Eye,
  CheckCircle2, AlertCircle, XCircle, ChevronLeft, ChevronRight,
  Clock, Image as ImageIcon
} from "lucide-react"
import type { Locale } from "@/i18n/config"
import { supabase } from "@/lib/supabase"
import { getDictionary } from "@/i18n/get-dictionary"
import { Icons } from "@/components/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface HistoryItem {
  id: string
  created_at: string
  image_name: string
  classification: string
  confidence: number
  processing_time: number
}

interface HistoryDetail {
  id: string
  created_at: string
  original_image: string
  image_name: string
  classification: string
  confidence: number
  prob_normal: number
  prob_benign: number
  prob_malignant: number
  gradcam_image: string | null
  attention_image: string | null
  processing_time: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ProfileClient({ lang }: { lang: string }) {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dict, setDict] = useState<any>(null)
  const [historyData, setHistoryData] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [selectedDetail, setSelectedDetail] = useState<HistoryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const router = useRouter()

  // 加载用户数据
  useEffect(() => {
    getDictionary(lang as Locale).then(setDict)

    async function loadUserData() {
      const userEmail = decodeURIComponent(document.cookie
        .split('; ')
        .find(row => row.startsWith('userEmail='))
        ?.split('=')[1] || '');

      if (!userEmail) {
        router.push(`/${lang}/signin`);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select()
          .eq('email', userEmail)
          .single();

        if (error) throw error;
        setUserData(data);
      } catch (error) {
        console.error('Error loading user data:', error);
        router.push(`/${lang}/signin`);
      } finally {
        setLoading(false);
      }
    }

    loadUserData()
  }, [lang, router])

  // 加载历史记录
  const loadHistory = async (page: number = 1) => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/inference/history?page=${page}&limit=10`)
      if (!response.ok) throw new Error('Failed to fetch history')

      const result = await response.json()
      setHistoryData(result.data || [])
      setPagination(result.pagination)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 加载详情
  const loadDetail = async (id: string) => {
    setDetailLoading(true)
    setShowDetailDialog(true)
    try {
      const response = await fetch(`/api/inference/history/${id}`)
      if (!response.ok) throw new Error('Failed to fetch detail')

      const data = await response.json()
      setSelectedDetail(data)
    } catch (error) {
      console.error('Error loading detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  // 删除记录
  const deleteHistory = async (id: string) => {
    if (!confirm(dict?.profile?.history?.confirmDelete || 'Are you sure you want to delete this record?')) return

    try {
      const response = await fetch('/api/inference/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error('Failed to delete')

      // 重新加载当前页
      loadHistory(pagination.page)
    } catch (error) {
      console.error('Error deleting history:', error)
    }
  }

  // 获取分类样式
  const getClassificationStyle = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'normal':
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 }
      case 'benign':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertCircle }
      case 'malignant':
        return { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: XCircle }
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle }
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading || !dict) {
    return (
      <div className="container py-12 flex justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!userData) {
    return null
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold mb-8">{dict.profile?.title || 'Profile'}</h1>

      <Tabs defaultValue="profile" className="space-y-6" onValueChange={(v) => v === 'history' && loadHistory()}>
        <TabsList className="grid w-full max-w-[600px] grid-cols-4 gap-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.profile?.tabs?.profile || 'Profile'}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.profile?.tabs?.history || 'History'}</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.profile?.tabs?.subscription || 'Subscription'}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.profile?.tabs?.settings || 'Settings'}</span>
          </TabsTrigger>
        </TabsList>

        {/* 基本信息 Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{dict.profile?.basicInfo || 'Basic Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">{dict.profile?.email || 'Email'}</div>
                <div className="font-medium">{userData.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{dict.profile?.joinDate || 'Join Date'}</div>
                <div className="font-medium">{userData.user_created}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 历史记录 Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{dict.profile?.history?.title || 'Detection History'}</CardTitle>
              <CardDescription>
                {dict.profile?.history?.description || 'View your past lung cancer detection results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Icons.spinner className="h-8 w-8 animate-spin" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{dict.profile?.history?.empty || 'No detection history yet'}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push(`/${lang}/demo`)}
                  >
                    {dict.profile?.history?.tryDemo || 'Try Demo'}
                  </Button>
                </div>
              ) : (
                <>
                  {/* 历史记录列表 */}
                  <div className="space-y-3">
                    {historyData.map((item) => {
                      const style = getClassificationStyle(item.classification)
                      const Icon = style.icon
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${style.bg}`}>
                              <Icon className={`h-5 w-5 ${style.color}`} />
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">
                                {item.image_name || 'Unnamed Image'}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{formatDate(item.created_at)}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.processing_time}ms
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${style.color} hidden sm:inline`}>
                              {dict.profile?.history?.labels?.[item.classification.toLowerCase()] || item.classification}
                            </span>
                            <span className="text-sm text-muted-foreground hidden sm:inline">
                              ({(item.confidence * 100).toFixed(1)}%)
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => loadDetail(item.id)}
                              title={dict.profile?.history?.viewDetail || 'View Detail'}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteHistory(item.id)}
                              className="text-destructive hover:text-destructive"
                              title={dict.profile?.history?.delete || 'Delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 分页 */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => loadHistory(pagination.page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {dict.profile?.history?.prev || 'Prev'}
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => loadHistory(pagination.page + 1)}
                      >
                        {dict.profile?.history?.next || 'Next'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订阅信息 Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>{dict.profile?.subscription || 'Subscription'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">{dict.profile?.currentPlan || 'Current Plan'}</div>
                <div className="font-medium">{dict.profile?.freePlan || 'Free Plan'}</div>
              </div>
              {userData.plans_end && (
                <div>
                  <div className="text-sm text-muted-foreground">{dict.profile?.expireDate || 'Expire Date'}</div>
                  <div className="font-medium">{userData.plans_end}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 设置 Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{dict.profile?.settings || 'Settings'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{dict.profile?.settingsComingSoon || 'More settings coming soon...'}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 详情弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dict.profile?.history?.detailTitle || 'Detection Details'}</DialogTitle>
            <DialogDescription>
              {selectedDetail?.image_name} - {selectedDetail && formatDate(selectedDetail.created_at)}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedDetail && (
            <div className="space-y-6">
              {/* 原始图像 */}
              <div>
                <p className="text-sm font-medium mb-2">{dict.profile?.history?.originalImage || 'Original Image'}</p>
                <div className="aspect-video max-w-sm rounded-lg overflow-hidden bg-muted border">
                  <img
                    src={selectedDetail.original_image}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* 分类结果 */}
              <div className={`p-4 rounded-xl ${getClassificationStyle(selectedDetail.classification).bg}`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getClassificationStyle(selectedDetail.classification).icon
                    return <Icon className={`h-8 w-8 ${getClassificationStyle(selectedDetail.classification).color}`} />
                  })()}
                  <div>
                    <p className="text-sm text-muted-foreground">{dict.demo?.result?.classification || 'Classification'}</p>
                    <p className={`text-2xl font-bold ${getClassificationStyle(selectedDetail.classification).color}`}>
                      {dict.profile?.history?.labels?.[selectedDetail.classification.toLowerCase()] || selectedDetail.classification}
                    </p>
                  </div>
                </div>
              </div>

              {/* 置信度 */}
              <div>
                <p className="text-sm font-medium mb-3">{dict.demo?.result?.confidence || 'Confidence Distribution'}</p>
                <div className="space-y-3">
                  {[
                    { key: 'normal', value: selectedDetail.prob_normal },
                    { key: 'benign', value: selectedDetail.prob_benign },
                    { key: 'malignant', value: selectedDetail.prob_malignant },
                  ].map(({ key, value }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{dict.profile?.history?.labels?.[key] || key}</span>
                        <span className="font-medium">{((value || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            key === 'normal' ? 'bg-emerald-500' :
                            key === 'benign' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${(value || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 可视化 */}
              {(selectedDetail.gradcam_image || selectedDetail.attention_image) && (
                <div>
                  <p className="text-sm font-medium mb-3">{dict.demo?.result?.visualization || 'Visualization'}</p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDetail.gradcam_image && (
                      <div className="space-y-2">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                          <img src={selectedDetail.gradcam_image} alt="Grad-CAM++" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">Grad-CAM++</p>
                      </div>
                    )}
                    {selectedDetail.attention_image && (
                      <div className="space-y-2">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                          <img src={selectedDetail.attention_image} alt="Attention Map" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">Attention Map</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 处理时间 */}
              <div className="text-sm text-muted-foreground flex items-center gap-2 pt-2 border-t">
                <Clock className="h-4 w-4" />
                {dict.profile?.history?.processingTime || 'Processing Time'}: {selectedDetail.processing_time}ms
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

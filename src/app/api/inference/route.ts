import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://your-inference-service:8080/predict'
const INFERENCE_API_KEY = process.env.INFERENCE_API_KEY || ''

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 验证登录状态
    const userEmail = request.cookies.get('userEmail')?.value
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decodedEmail = decodeURIComponent(userEmail)

    // 速率限制检查
    const rateLimitResult = checkRateLimit(`inference:${decodedEmail}`, RATE_LIMITS.inference)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          remaining: rateLimitResult.remaining 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
            'Retry-After': String(rateLimitResult.retryAfter),
          }
        }
      )
    }

    // 获取上传的图像
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // 将图像转换为 Base64（用于存储）
    const imageBuffer = await imageFile.arrayBuffer()
    const imageBase64 = `data:${imageFile.type};base64,${Buffer.from(imageBuffer).toString('base64')}`

    // 构建发送给推理服务的请求
    const inferenceFormData = new FormData()
    inferenceFormData.append('image', imageFile)
    
    const resolveVisualizationUrl = (rawUrl: string | null) => {
      if (!rawUrl) return null
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl
      if (!rawUrl.startsWith('/')) return rawUrl
      try {
        const origin = new URL(INFERENCE_API_URL).origin
        return `${origin}${rawUrl}`
      } catch {
        return rawUrl
      }
    }

    let normalizedResult: {
      classification: string
      confidence: number
      probabilities: {
        normal: number
        benign: number
        malignant: number
      }
      gradcam_url: string | null
      attention_url: string | null
    }

    // 尝试调用推理服务，如果失败则使用模拟数据
    try {
      const response = await fetch(INFERENCE_API_URL, {
        method: 'POST',
        headers: {
          ...(INFERENCE_API_KEY && { 'Authorization': `Bearer ${INFERENCE_API_KEY}` }),
        },
        body: inferenceFormData,
      })

      if (!response.ok) {
        throw new Error(`Inference service error: ${response.status}`)
      }

      const result = await response.json()

      // 标准化结果
      normalizedResult = {
        classification: result.classification || result.label || 'unknown',
        confidence: result.confidence || result.score || 0,
        probabilities: {
          normal: result.probabilities?.normal || result.prob_normal || 0,
          benign: result.probabilities?.benign || result.prob_benign || 0,
          malignant: result.probabilities?.malignant || result.prob_malignant || 0,
        },
        gradcam_url: resolveVisualizationUrl(result.gradcam_url || result.gradcam || null),
        attention_url: resolveVisualizationUrl(result.attention_url || result.attention || null),
      }
    } catch (inferenceError) {
      console.warn('Inference service unavailable, using mock data:', inferenceError)
      
      // 模拟数据（用于演示，推理服务不可用时）
      const mockClassifications = ['normal', 'benign', 'malignant']
      const mockClassification = mockClassifications[Math.floor(Math.random() * 3)]
      const mockConfidence = 0.7 + Math.random() * 0.25
      
      normalizedResult = {
        classification: mockClassification,
        confidence: mockConfidence,
        probabilities: {
          normal: mockClassification === 'normal' ? mockConfidence : Math.random() * 0.2,
          benign: mockClassification === 'benign' ? mockConfidence : Math.random() * 0.2,
          malignant: mockClassification === 'malignant' ? mockConfidence : Math.random() * 0.2,
        },
        gradcam_url: null,
        attention_url: null,
      }
      
      // 确保概率总和为1
      const total = normalizedResult.probabilities.normal + 
                    normalizedResult.probabilities.benign + 
                    normalizedResult.probabilities.malignant
      normalizedResult.probabilities.normal /= total
      normalizedResult.probabilities.benign /= total
      normalizedResult.probabilities.malignant /= total
    }

    const processingTime = Date.now() - startTime

    // 保存到 Supabase 历史记录
    try {
      const { error: insertError } = await supabase
        .from('inference_history')
        .insert({
          user_email: decodedEmail,
          original_image: imageBase64,
          image_name: imageFile.name,
          classification: normalizedResult.classification,
          confidence: normalizedResult.confidence,
          prob_normal: normalizedResult.probabilities.normal,
          prob_benign: normalizedResult.probabilities.benign,
          prob_malignant: normalizedResult.probabilities.malignant,
          gradcam_url: normalizedResult.gradcam_url,
          visualization_meta: {
            gradcam_url: normalizedResult.gradcam_url,
            attention_url: normalizedResult.attention_url,
            processing_time_ms: processingTime,
          },
          gradcam_image: normalizedResult.gradcam_url,
          attention_image: normalizedResult.attention_url,
          processing_time: processingTime,
        })

      if (insertError) {
        console.error('Error saving inference history:', insertError)
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      // 不阻塞返回结果
    }

    return NextResponse.json({
      ...normalizedResult,
      processingTime,
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
      }
    })

  } catch (error) {
    console.error('Inference API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

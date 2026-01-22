import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// 获取历史记录列表
export async function GET(request: NextRequest) {
  try {
    const userEmail = request.cookies.get('userEmail')?.value
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedEmail = decodeURIComponent(userEmail)

    // 速率限制检查
    const rateLimitResult = checkRateLimit(`history:${decodedEmail}`, RATE_LIMITS.history)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // 获取记录总数
    const { count } = await supabase
      .from('inference_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', decodedEmail)

    // 获取分页数据
    const { data, error } = await supabase
      .from('inference_history')
      .select('id, created_at, image_name, classification, confidence, processing_time')
      .eq('user_email', decodedEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    })

  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 删除历史记录
export async function DELETE(request: NextRequest) {
  try {
    const userEmail = request.cookies.get('userEmail')?.value
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedEmail = decodeURIComponent(userEmail)

    // 速率限制检查
    const rateLimitResult = checkRateLimit(`delete:${decodedEmail}`, RATE_LIMITS.delete)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('inference_history')
      .delete()
      .eq('id', id)
      .eq('user_email', decodedEmail)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

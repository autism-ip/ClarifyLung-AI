import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data, error } = await supabase
      .from('inference_history')
      .select('*')
      .eq('id', params.id)
      .eq('user_email', decodedEmail)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching history detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

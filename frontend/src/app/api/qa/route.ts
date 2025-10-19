import { NextRequest, NextResponse } from 'next/server'
import { loggedFetch } from '@/lib/dev/apiLog'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const q: string = String(body?.question || '').trim()
    if (!q) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }
    // Require lecture and slide context (via search params) and forward to backend
    const lecture = req.nextUrl.searchParams.get('lecture')
    const slide = req.nextUrl.searchParams.get('slide')
    if (!lecture || !slide) {
      return NextResponse.json({ error: 'lecture and slide are required' }, { status: 400 })
    }
    const res = await loggedFetch(
      `/api/backend/lectures/answer/${encodeURIComponent(lecture)}/${encodeURIComponent(slide)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) }
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

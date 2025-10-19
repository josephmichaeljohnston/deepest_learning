import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function POST(
  req: NextRequest,
  { params }: { params: { lectureId: string; slide: string } }
) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/user-question/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  try {
    const body = await req.text()
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 })
  }
}

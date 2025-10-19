import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function POST(
  req: NextRequest,
  { params }: { params: { lectureId: string; slide: string } }
) {
  const { lectureId, slide } = params
  try {
    const body = await req.json()
    const url = `${BACKEND_URL}/lectures/answer/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 })
  }
}

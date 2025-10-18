import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function GET(req: NextRequest, { params }: { params: { lectureId: string; slide: string } }) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/audio/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'audio not found' }, { status: res.status })
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const body = res.body
    return new NextResponse(body as any, {
      headers: { 'Content-Type': contentType },
      status: 200,
    })
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 })
  }
}

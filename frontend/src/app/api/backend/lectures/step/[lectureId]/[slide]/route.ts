import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function GET(req: NextRequest, { params }: { params: { lectureId: string; slide: string } }) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/step/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  console.log('[step proxy] Proxying to:', url)
  try {
    const res = await fetch(url, { method: 'GET' })
    console.log('[step proxy] Backend response status:', res.status)
    const body = await res.json()
    console.log('[step proxy] Backend response body:', body)
    return NextResponse.json(body, { status: res.status })
  } catch (e) {
    console.error('[step proxy] Proxy error:', e)
    return NextResponse.json({ error: 'proxy failed'+String(e) }, { status: 502 })
  }
}

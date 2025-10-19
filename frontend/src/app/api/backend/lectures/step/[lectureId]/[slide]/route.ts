import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest, { params }: { params: { lectureId: string; slide: string } }) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/step/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  console.log('[step proxy] Proxying to:', url)
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    console.log('[step proxy] Backend response status:', res.status)
  const body = await res.json()
  console.log('[step proxy] Backend response body:', body)
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  return new NextResponse(JSON.stringify(body), { status: res.status, headers })
  } catch (e) {
    console.error('[step proxy] Proxy error:', e)
    return NextResponse.json({ error: 'proxy failed'+String(e) }, { status: 502 })
  }
}

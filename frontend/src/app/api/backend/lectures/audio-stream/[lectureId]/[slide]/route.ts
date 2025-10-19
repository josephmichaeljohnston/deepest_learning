import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

// Disable Next.js data caching for this streaming route
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Proxy backend audio streaming endpoint
export async function GET(
  _req: NextRequest,
  { params }: { params: { lectureId: string; slide: string } }
) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/audio-stream/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  try {
    // Do not send Range; allow backend to stream progressively
    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json({ error: 'audio stream not available' }, { status: res.status })
    }

    // Pass through streaming-related headers
  const outHeaders = new Headers()
    const contentType = res.headers.get('content-type') || 'audio/mpeg'
    const transferEncoding = res.headers.get('transfer-encoding')
    const cacheControl = res.headers.get('cache-control')

    outHeaders.set('Content-Type', contentType)
    if (transferEncoding) outHeaders.set('Transfer-Encoding', transferEncoding)
  outHeaders.set('Cache-Control', cacheControl || 'no-store')
  // Hints to avoid proxy buffering and keep streaming smooth
  outHeaders.set('X-Accel-Buffering', 'no')
  outHeaders.set('Connection', 'keep-alive')

    return new NextResponse(res.body as any, {
      status: res.status,
      headers: outHeaders,
    })
  } catch (e) {
    return NextResponse.json({ error: 'stream proxy failed' }, { status: 502 })
  }
}

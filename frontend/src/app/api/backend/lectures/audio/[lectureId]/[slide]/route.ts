import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

// Proxy backend audio with Range support and proper header passthrough
export async function GET(
  req: NextRequest,
  { params }: { params: { lectureId: string; slide: string } }
) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/audio/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  try {
    // Forward Range header if present so the backend can serve partial content (206)
    const range = req.headers.get('range') || undefined
    const headers: Record<string, string> = {}
    if (range) headers['Range'] = range

    const res = await fetch(url, { method: 'GET', headers })

    if (!res.ok && res.status !== 206) {
      return NextResponse.json({ error: 'audio not found' }, { status: res.status })
    }

    // Pass through streaming-related headers
    const outHeaders = new Headers()
    const contentType = res.headers.get('content-type') || 'audio/wav'
    const contentLength = res.headers.get('content-length')
    const contentRange = res.headers.get('content-range')
    const acceptRanges = res.headers.get('accept-ranges') || (contentRange ? 'bytes' : '')

    outHeaders.set('Content-Type', contentType)
    if (contentLength) outHeaders.set('Content-Length', contentLength)
    if (contentRange) outHeaders.set('Content-Range', contentRange)
    if (acceptRanges) outHeaders.set('Accept-Ranges', acceptRanges)
    // Avoid caching during dev to reduce stale responses
    outHeaders.set('Cache-Control', 'no-store')

    return new NextResponse(res.body as any, {
      status: res.status,
      headers: outHeaders,
    })
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 })
  }
}

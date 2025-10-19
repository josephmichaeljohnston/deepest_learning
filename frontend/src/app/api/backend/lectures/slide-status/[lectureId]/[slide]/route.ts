import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(_req: NextRequest, { params }: { params: { lectureId: string; slide: string } }) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/slide-status/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({ error: 'backend error', status: res.status, body: text }, { status: res.status })
    }
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: 200 })
    } catch {
      return NextResponse.json({ error: 'invalid backend response', body: text }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed', detail: String(e) }, { status: 502 })
  }
}

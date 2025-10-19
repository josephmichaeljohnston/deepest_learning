import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(_req: NextRequest, { params }: { params: { lectureId: string } }) {
  const { lectureId } = params
  const url = `${BACKEND_URL}/lectures/reset/${encodeURIComponent(lectureId)}`
  try {
    const res = await fetch(url, { method: 'POST', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'reset proxy failed' }, { status: 502 })
  }
}

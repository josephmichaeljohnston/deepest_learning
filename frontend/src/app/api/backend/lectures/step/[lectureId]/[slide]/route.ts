import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function GET(req: NextRequest, { params }: { params: { lectureId: string; slide: string } }) {
  const { lectureId, slide } = params
  const url = `${BACKEND_URL}/lectures/step/${encodeURIComponent(lectureId)}/${encodeURIComponent(slide)}`
  try {
  const res = await fetch(url, { method: 'GET' })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 })
  }
}

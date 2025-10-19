import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as unknown as File | null
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    const out = new FormData()
    // Flask expects field name 'file_obj'
    out.append('file_obj', file, file.name)

    const url = `${BACKEND_URL}/lectures/instantiate-lecture`
  const res = await fetch(url, { method: 'POST', body: out as any })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 })
  }
}

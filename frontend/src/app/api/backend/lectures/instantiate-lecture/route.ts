import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as unknown as File | null
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    // Convert File to Blob for FormData (Node.js compatible)
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
    const out = new FormData()
    // Flask expects field name 'file_obj'
    out.append('file_obj', blob, file.name)

    const url = `${BACKEND_URL}/lectures/instantiate-lecture`
    console.log('[instantiate-lecture] Proxying to:', url)
    const res = await fetch(url, { method: 'POST', body: out as any })
    console.log('[instantiate-lecture] Backend response status:', res.status)
    
    const text = await res.text()
    console.log('[instantiate-lecture] Backend response text:', text.substring(0, 500))
    
    if (!res.ok) {
      console.error('[instantiate-lecture] Backend returned error status')
      return NextResponse.json({ error: `Backend error: ${res.status}`, details: text }, { status: res.status })
    }
    
    try {
      const body = JSON.parse(text)
      console.log('[instantiate-lecture] Backend response:', body)
      return NextResponse.json(body, { status: res.status })
    } catch (parseErr) {
      console.error('[instantiate-lecture] Failed to parse JSON response:', parseErr)
      return NextResponse.json({ error: 'Invalid response from backend', details: text }, { status: 502 })
    }
  } catch (e) {
    console.error('[instantiate-lecture] Proxy error:', e)
    return NextResponse.json({ error: `proxy failed: ${String(e)}` }, { status: 502 })
  }
}

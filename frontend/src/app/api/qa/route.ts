import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const q: string = String(body?.question || '').trim()
    if (!q) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }
    // Mock: In the future, call your backend/LLM here
    return NextResponse.json({ ok: true, answer: 'Received. Thanks for your question!' })
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

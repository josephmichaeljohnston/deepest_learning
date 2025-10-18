import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client only when API key is available
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null
  }
  return new OpenAI({ apiKey })
}

export async function GET() {
  return NextResponse.json({ message: 'OpenAI API endpoint is ready' })
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'gpt-3.5-turbo' } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content || 'No response generated'

    return NextResponse.json({ 
      response,
      usage: completion.usage 
    })

  } catch (error: any) {
    console.error('OpenAI API error:', error)
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing.' },
        { status: 429 }
      )
    }
    
    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process request with OpenAI' },
      { status: 500 }
    )
  }
}
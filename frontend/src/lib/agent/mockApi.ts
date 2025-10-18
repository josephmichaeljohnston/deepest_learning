'use client'

import { AgentSessionConfig, AgentStep } from './types'
import { extractPageText } from '@/lib/pdf/extract'

// Simple helper to simulate network delay
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// A few royalty-free sample audio URLs (small, public). Fallback to a generated beep if blocked.
// Note: In production, these would be signed URLs or served via your API.
const SAMPLE_AUDIO: string[] = [
  // Public domain test tones; if blocked, the audio controller will fall back to a local beep.
  'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
]

export async function fetchAgentPlan(
  config: AgentSessionConfig
): Promise<{ steps: AgentStep[] }> {
  // Simulate server thinking time
  await sleep(600)

  const { totalPages, strategy = 'scripted', pdfUrl } = config

  // Helpers
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  const uniqueSet = new Set<number>()

  // Phase A: randomized linear window
  const maxLinear = Math.min(5, Math.max(1, totalPages))
  const minLinear = Math.min(2, maxLinear)
  const linearCount = totalPages >= 2 ? randInt(minLinear, maxLinear) : 1
  const maxStart = Math.max(1, totalPages - linearCount + 1)
  const start = randInt(1, maxStart)
  const linearPages = Array.from({ length: linearCount }, (_, i) => start + i)
  linearPages.forEach(p => uniqueSet.add(p))

  // Phase B: random unique pages not in linear window
  const maxRandom = Math.min(5, totalPages)
  const minRandom = Math.min(2, maxRandom) // allow 1 when totalPages=1
  const randomCount = maxRandom > 0 ? randInt(minRandom, maxRandom) : 0
  const randomPages: number[] = []
  while (randomPages.length < randomCount) {
    const n = randInt(1, totalPages)
    if (!uniqueSet.has(n)) {
      uniqueSet.add(n)
      // avoid repeating the last selected page between picks
      const last = randomPages[randomPages.length - 1] ?? linearPages[linearPages.length - 1]
      if (n !== last) randomPages.push(n)
    }
    // Break safety for tiny documents
    if (uniqueSet.size >= totalPages) break
  }

  const pages = strategy === 'linear' ? linearPages : strategy === 'random' ? randomPages : [...linearPages, ...randomPages]

  // Extract text (best-effort). Compute a speak time estimate based on word count (e.g., 150 wpm ~= 2.5 wps)
  const steps: AgentStep[] = []
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    let text = ''
    if (pdfUrl) {
      text = await extractPageText(pdfUrl, page)
    }
    // Fallback transcript
    const transcript = text || `Narration for slide ${page}.`
    // Estimate: 2.5 words/second; min 4s, max 15s for demo
    const words = transcript.split(/\s+/).filter(Boolean).length
    const estimatedMs = Math.min(15000, Math.max(4000, Math.ceil((words / 2.5) * 1000)))
    const inLinear = linearPages.includes(page)
    steps.push({
      page,
      audioUrl: SAMPLE_AUDIO[i % SAMPLE_AUDIO.length],
      transcript,
      ttsText: transcript,
      label: `${inLinear ? 'Linear' : 'Random'} • Slide ${page}`,
      speakMs: estimatedMs,
    })
  }

  return { steps }
}

'use client'

import type { AgentSessionConfig, AgentStep } from './types'
import { loggedFetch } from '@/lib/dev/apiLog'

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function fetchAgentPlanFromBackend(
  config: AgentSessionConfig
): Promise<{ steps: AgentStep[] }> {
  const { totalPages, strategy = 'scripted', lectureId } = config
  if (!lectureId) throw new Error('lectureId required for backend plan')
  if (!totalPages || totalPages < 1) throw new Error('totalPages must be known before starting the agent')

  // Phase A: linear window
  const maxLinear = Math.min(5, Math.max(1, totalPages))
  const minLinear = Math.min(2, maxLinear)
  const linearCount = totalPages >= 2 ? randInt(minLinear, maxLinear) : 1
  const maxStart = Math.max(1, totalPages - linearCount + 1)
  const start = randInt(1, maxStart)
  const linearPages = Array.from({ length: linearCount }, (_, i) => start + i)

  // Phase B: extra random picks
  const unique = new Set<number>(linearPages)
  const maxRandom = Math.min(5, totalPages)
  const minRandom = Math.min(2, maxRandom)
  const randomCount = maxRandom > 0 ? randInt(minRandom, maxRandom) : 0
  const randomPages: number[] = []
  while (randomPages.length < randomCount) {
    const n = randInt(1, totalPages)
    if (!unique.has(n)) {
      unique.add(n)
      const last = randomPages[randomPages.length - 1] ?? linearPages[linearPages.length - 1]
      if (n !== last) randomPages.push(n)
    }
    if (unique.size >= totalPages) break
  }

  const pages = strategy === 'linear' ? linearPages : strategy === 'random' ? randomPages : [...linearPages, ...randomPages]

  // For each page, ask backend to generate/return slide text and audio
  const steps: AgentStep[] = []
  for (const page of pages) {
    const res = await loggedFetch(`/api/backend/lectures/step/${encodeURIComponent(String(lectureId))}/${page}`)
    if (!res.ok) throw new Error(`Failed to fetch step for page ${page}`)
    const data = await res.json()
    const text: string = data?.text || `Slide ${page}`
    // Estimate speaking time based on word count (min 4s, max 15s)
    const words = text.split(/\s+/).filter(Boolean).length
    const estimatedMs = Math.min(15000, Math.max(4000, Math.ceil((words / 2.5) * 1000)))
    const audioUrl = `/api/backend/lectures/audio/${encodeURIComponent(String(lectureId))}/${page}`
    steps.push({
      page,
      transcript: text,
      ttsText: text,
      audioUrl,
      label: `${linearPages.includes(page) ? 'Linear' : 'Random'} • Slide ${page}`,
      speakMs: estimatedMs,
    })
  }

  return { steps }
}

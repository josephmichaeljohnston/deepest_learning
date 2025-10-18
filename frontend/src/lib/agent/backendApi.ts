// frontend/src/lib/agent/backendApi.ts
'use client'

import type { AgentSessionConfig, AgentStep } from './types'
import { loggedFetch } from '@/lib/dev/apiLog'

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function fetchAgentPlanFromBackend(
  config: AgentSessionConfig
): Promise<{ steps: AgentStep[] }> {
  const { totalPages, strategy = 'scripted', lectureId } = config
  
  if (!lectureId) {
    throw new Error('Lecture ID is required. Please ensure the PDF was uploaded to the backend.')
  }
  
  if (!totalPages || totalPages < 1) {
    throw new Error('Total pages must be known before starting the agent')
  }

  // Small delay to simulate planning time
  await sleep(300)

  // Just load the first page
  const page = 1
  const steps: AgentStep[] = []
  
  try {
    const res = await loggedFetch(
      `/api/backend/lectures/step/${encodeURIComponent(String(lectureId))}/${page}`
    )
    
    if (!res.ok) {
      throw new Error(`Failed to fetch step for page ${page}: ${res.status}`)
    }
    
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
      label: `Slide ${page}`,
      speakMs: estimatedMs,
    })
  } catch (error) {
    console.error(`Error fetching step for page ${page}:`, error)
    throw new Error('Failed to fetch the first step from the backend')
  }

  return { steps }
}
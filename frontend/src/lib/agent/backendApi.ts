'use client'

import type { AgentStep } from './types'
import { loggedFetch } from '@/lib/dev/apiLog'

/**
 * Fetch a single step (slide) from the backend.
 * Pages are loaded sequentially on-demand as the user progresses through the lecture.
 */
export async function fetchStepFromBackend(
  lectureId: number,
  pageNumber: number
): Promise<AgentStep> {
  if (!lectureId || typeof lectureId !== 'number' || lectureId < 1) {
    throw new Error(`Invalid lectureId: ${lectureId}`)
  }
  if (!pageNumber || typeof pageNumber !== 'number' || pageNumber < 1) {
    throw new Error(`Invalid pageNumber: ${pageNumber}`)
  }
  
  console.log('[fetchStepFromBackend] Fetching step for page:', pageNumber, 'lectureId:', lectureId)
  const url = `/api/backend/lectures/step/${encodeURIComponent(String(lectureId))}/${pageNumber}`
  console.log('[fetchStepFromBackend] Calling proxy URL:', url)
  const res = await loggedFetch(url)
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[fetchStepFromBackend] Failed to fetch step for page', pageNumber, 'status:', res.status, 'response:', errorText)
    throw new Error(`Failed to fetch step for page ${pageNumber}`)
  }
  const data = await res.json()
  console.log('[fetchStepFromBackend] Response data:', data)
  const text: string = data?.text || `Slide ${pageNumber}`
  // Estimate speaking time based on word count (min 4s, max 15s)
  const words = text.split(/\s+/).filter(Boolean).length
  const estimatedMs = Math.min(15000, Math.max(4000, Math.ceil((words / 2.5) * 1000)))
  const audioUrl = `/api/backend/lectures/audio/${encodeURIComponent(String(lectureId))}/${pageNumber}`
  const audioStatusUrl = `/api/backend/lectures/audio-status/${encodeURIComponent(String(lectureId))}/${pageNumber}`
  
  console.log('[fetchStepFromBackend] Step fetched for page', pageNumber, '- Audio URL:', audioUrl)
  
  return {
    page: pageNumber,
    transcript: text,
    ttsText: text,
    audioUrl,
    audioStatusUrl,
    label: `Slide ${pageNumber}`,
    speakMs: estimatedMs,
  }
}

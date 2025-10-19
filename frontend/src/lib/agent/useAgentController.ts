'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PdfCarouselRef } from '@/components/PdfCarousel'
import { fetchStepFromBackend } from './backendApi'
import type { AgentControllerState, AgentSessionConfig, AgentStep } from './types'
import { useAudioController } from '@/lib/audio/useAudioController'

export interface AgentControllerApi {
  state: AgentControllerState
  currentStep?: AgentStep
  start: (cfg?: Partial<AgentSessionConfig>) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  skipTo: (index: number) => Promise<void>
  jumpTo: (index: number) => Promise<void>
  progress: number
  requestPrompt: (message?: string) => void
}

export function useAgentController(
  pdfRef: React.RefObject<PdfCarouselRef>,
  baseConfig: AgentSessionConfig,
  opts?: { navigate?: (page: number) => void; onPrompt?: (message?: string) => void }
): AgentControllerApi {
  const [state, setState] = useState<AgentControllerState>({
    status: 'idle',
    currentStepIndex: -1,
    steps: [],
  })
  const audio = useAudioController()
  const [progress, setProgress] = useState(0)
  const isAdvancingRef = useRef(false)
  const userSkipRef = useRef(false)
  const postSlidePromptRef = useRef<((msg?: string) => void) | null>(null)
  const nextAfterPromptRef = useRef(false)
  const pendingNextIndexRef = useRef<number | null>(null)
  const configRef = useRef<AgentSessionConfig>(baseConfig)

  // Update configRef whenever baseConfig changes (e.g., totalPages becomes known)
  useEffect(() => {
    configRef.current = baseConfig
  }, [baseConfig])
  
  const loadingNextRef = useRef(false)
  const pendingNav = useRef<Promise<void> | null>(null)

  const navigateTo = useCallback(async (page: number) => {
    const go = async () => {
      if (opts?.navigate) {
        opts.navigate(page)
      } else {
        const api = pdfRef.current
        api?.goToPage(page)
      }
      await new Promise((r) => setTimeout(r, 150))
    }
    const p = go().finally(() => {
      if (pendingNav.current === p) pendingNav.current = null
    })
    pendingNav.current = p
    await p
  }, [opts, pdfRef])

  const playStep = useCallback(
    async (step: AgentStep) => {
      setState((s) => ({ ...s, status: 'navigating' }))
      console.log('[playStep] Navigating to page:', step.page)
      await navigateTo(step.page)
      setState((s) => ({ ...s, status: 'playing' }))
      // Play audio only - no Web Speech API
      console.log('[playStep] Playing audio from:', step.audioUrl)
      audio.play(step.audioUrl, step.audioStatusUrl).catch((err) => {
        console.error('[playStep] Audio playback failed:', err?.message || err)
      })
    },
    [audio, navigateTo]
  )

  const start = useCallback(
    async (cfg?: Partial<AgentSessionConfig>) => {
      console.log('[agent.start] Called with cfg:', cfg)
      console.log('[agent.start] baseConfig:', baseConfig)
      
      // Clean up any prior run to ensure fresh state
      try {
        audio.stop()
      } catch {}
      
      setState((s) => ({ ...s, status: 'fetching', error: undefined }))
      try {
        const merged = { ...baseConfig, ...cfg }
        console.log('[agent.start] Merged config:', merged)
        configRef.current = merged
        if (!merged.lectureId) {
          throw new Error('lectureId required to start lecture')
        }
        if (!merged.totalPages || merged.totalPages < 1) {
          throw new Error('totalPages must be known before starting')
        }

        console.log('[agent.start] Starting lecture:', merged.lectureId, 'Total pages:', merged.totalPages)
        
        // Fetch and play the first step
        const lectureId = typeof merged.lectureId === 'number' ? merged.lectureId : parseInt(String(merged.lectureId))
        console.log('[agent.start] Calling fetchStepFromBackend with lectureId:', lectureId)
        const firstStep = await fetchStepFromBackend(lectureId, 1)
        console.log('[agent.start] First step fetched:', firstStep)
        setState({ status: 'navigating', currentStepIndex: 0, steps: [firstStep] })
        await playStep(firstStep)
      } catch (e: any) {
        console.error('[agent.start] Error:', e?.message || e)
        setState((s) => ({ ...s, status: 'error', error: e?.message || 'Unknown error' }))
      }
    },
    [audio, baseConfig, playStep]
  )

  const pause = useCallback(() => {
    audio.pause()
    setState((s) => ({ ...s, status: 'paused' }))
  }, [audio])

  const skipTo = useCallback(
    async (index: number) => {
      const steps = state.steps
      if (index < 0 || index >= steps.length) return
      audio.stop()
      setState((s) => ({ ...s, currentStepIndex: index }))
      await playStep(steps[index])
    },
    [audio, playStep, state.steps]
  )

  const resume = useCallback(() => {
    audio.resume()
    setState((s) => ({ ...s, status: 'playing' }))
  }, [audio, skipTo])

  const stop = useCallback(() => {
    audio.stop()
    setState({ status: 'stopped', currentStepIndex: -1, steps: [] })
  }, [audio])

  const jumpTo = useCallback(async (index: number) => {
    userSkipRef.current = true
    await skipTo(index)
  }, [skipTo])

  // Monitor audio playback to drive progress and auto-advance
  useEffect(() => {
    if (state.status !== 'playing') {
      setProgress(0)
      return
    }

    const updateProgress = () => {
      const duration = audio.duration
      const currentTime = audio.currentTime
      
      if (duration > 0) {
        const pct = Math.min(1, currentTime / duration)
        setProgress(pct)

        // Auto-advance when audio finishes
        if (pct >= 1 && audio.status === 'idle') {
          if (userSkipRef.current) {
            userSkipRef.current = false
            return
          }
          if (isAdvancingRef.current) return
          
          isAdvancingRef.current = true
          console.log('[AudioMonitor] Audio finished, advancing to next slide')
          
          ;(async () => {
            // Load next page if available
            const currentPage = state.steps[state.currentStepIndex]?.page ?? 1
            const nextPage = currentPage + 1
            const { totalPages } = configRef.current
            
            console.log('[AudioMonitor] Current page:', currentPage, 'Next page:', nextPage, 'Total pages:', totalPages)
            
            if (nextPage <= totalPages) {
              try {
                loadingNextRef.current = true
                const lectureId = configRef.current.lectureId
                if (!lectureId) throw new Error('lectureId required')
                console.log('[AudioMonitor] Loading next step for page:', nextPage)
                const nextStep = await fetchStepFromBackend(
                  typeof lectureId === 'number' ? lectureId : parseInt(String(lectureId)),
                  nextPage
                )
                // Append step and immediately play it
                setState((s) => ({
                  ...s,
                  steps: [...s.steps, nextStep],
                  currentStepIndex: s.currentStepIndex + 1,
                }))
                await playStep(nextStep)
              } catch (e) {
                console.error('[AudioMonitor] Failed to load next step:', e)
                stop()
              } finally {
                loadingNextRef.current = false
              }
            } else {
              console.log('[AudioMonitor] Reached end of document')
              stop()
            }
          })().finally(() => {
            isAdvancingRef.current = false
          })
        }
      }
    }

    const interval = setInterval(updateProgress, 100)
    return () => clearInterval(interval)
  }, [state.status, state.currentStepIndex, state.steps, audio.duration, audio.currentTime, audio.status, pause, stop])

  // Hook up external prompt handler
  useEffect(() => {
    postSlidePromptRef.current = opts?.onPrompt ?? null
  }, [opts?.onPrompt])

  const currentStep = useMemo(() => {
    if (state.currentStepIndex < 0) return undefined
    return state.steps[state.currentStepIndex]
  }, [state.currentStepIndex, state.steps])

  const requestPrompt = (message?: string) => {
    postSlidePromptRef.current?.(message)
  }

  return { state, currentStep, start, pause, resume, stop, skipTo, jumpTo, progress, requestPrompt }
}

// frontend/src/lib/agent/useAgentController.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PdfCarouselRef } from '@/components/PdfCarousel'
import { fetchAgentPlanFromBackend } from './backendApi'
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
  const progressTimer = useRef<number | null>(null)
  const progressStart = useRef<number>(0)
  const progressDuration = useRef<number>(0)
  const progressPausedAt = useRef<number | null>(null)
  const progressPauseAccum = useRef<number>(0)
  const pendingNav = useRef<Promise<void> | null>(null)
  const [ttsActive, setTtsActive] = useState(false)
  const ttsActiveRef = useRef(false)
  const isAdvancingRef = useRef(false)
  const ttsTextLenRef = useRef(0)
  const ttsBoundarySeenRef = useRef(false)
  const ttsBoundaryFallbackTimerRef = useRef<number | null>(null)
  const ttsStartRef = useRef<number | null>(null)
  const estimatedTotalMsRef = useRef<number>(0)
  const charRateRef = useRef<number>(0)
  const ttsTextRef = useRef<string>('')
  const ttsWordStartsRef = useRef<number[]>([])
  const ttsTotalWordsRef = useRef<number>(0)
  const userSkipRef = useRef(false)
  const postSlidePromptRef = useRef<((msg?: string) => void) | null>(null)
  const nextAfterPromptRef = useRef(false)
  const pendingNextIndexRef = useRef<number | null>(null)

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

  const stopProgress = useCallback(() => {
    if (progressTimer.current) {
      cancelAnimationFrame(progressTimer.current)
      progressTimer.current = null
    }
  }, [])

  const tickProgress = useCallback(() => {
    const now = performance.now()
    const paused = progressPausedAt.current
    const pauseAdj = progressPauseAccum.current + (paused ? now - paused : 0)
    const elapsed = now - progressStart.current - pauseAdj
    let pct = Math.min(1, elapsed / Math.max(1, progressDuration.current))
    if (ttsActiveRef.current && pct >= 1) pct = 0.98
    setProgress(pct)
    if (pct < 1 || ttsActiveRef.current) {
      progressTimer.current = requestAnimationFrame(tickProgress)
    } else {
      progressTimer.current = null
    }
  }, [])

  const startProgress = useCallback((durationMs: number) => {
    stopProgress()
    setProgress(0)
    progressDuration.current = Math.max(1000, durationMs)
    progressStart.current = performance.now()
    progressPausedAt.current = null
    progressPauseAccum.current = 0
    progressTimer.current = requestAnimationFrame(tickProgress)
  }, [stopProgress, tickProgress])

  const cancelSpeech = useRef<(() => void) | null>(null)

  const speakText = useCallback((text: string | undefined, fallbackMs?: number) => {
    if (ttsBoundaryFallbackTimerRef.current) {
      window.clearTimeout(ttsBoundaryFallbackTimerRef.current)
      ttsBoundaryFallbackTimerRef.current = null
    }
    ttsBoundarySeenRef.current = false
    ttsTextLenRef.current = text?.length ?? 0
    ttsTextRef.current = text || ''
    ttsWordStartsRef.current = []
    ttsTotalWordsRef.current = 0
    if (text) {
      const regex = /\b\w[\w'\-]*\b/g
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) {
        if (typeof m.index === 'number') {
          ttsWordStartsRef.current.push(m.index)
        }
      }
      ttsTotalWordsRef.current = ttsWordStartsRef.current.length
    }

    if (!text) {
      setTtsActive(false)
      ttsActiveRef.current = false
      return () => {}
    }
    try {
      const synth = window.speechSynthesis
      if (!synth) return () => {}
      if (synth.speaking) synth.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1
      utter.onstart = () => {
        setTtsActive(true)
        ttsActiveRef.current = true
        userSkipRef.current = false
        ttsStartRef.current = performance.now()
        charRateRef.current = 0
        estimatedTotalMsRef.current = fallbackMs || 5000
        startProgress(estimatedTotalMsRef.current)
      }
      utter.onboundary = (ev: any) => {
        ttsBoundarySeenRef.current = true
        stopProgress()
        const idx: number = typeof ev?.charIndex === 'number' ? ev.charIndex : 0
        const starts = ttsWordStartsRef.current
        const totalWords = Math.max(1, ttsTotalWordsRef.current)
        let low = 0, high = starts.length
        while (low < high) {
          const mid = (low + high) >> 1
          if (starts[mid] <= idx) low = mid + 1
          else high = mid
        }
        const spokenWords = Math.min(low, totalWords)
        let pctWords = spokenWords / totalWords
        if (ttsActiveRef.current && pctWords >= 1) pctWords = 0.98
        setProgress(pctWords)
      }
      utter.onend = () => {
        setTtsActive(false)
        ttsActiveRef.current = false
        stopProgress()
        setProgress(1)
      }
      synth.speak(utter)

      if (fallbackMs && fallbackMs > 0) {
        ttsBoundaryFallbackTimerRef.current = window.setTimeout(() => {
          if (!ttsBoundarySeenRef.current) {
            startProgress(fallbackMs)
          }
        }, 700)
      }

      const cancel = () => {
        try {
          synth.cancel()
        } finally {
          setTtsActive(false)
          ttsActiveRef.current = false
          if (ttsBoundaryFallbackTimerRef.current) {
            window.clearTimeout(ttsBoundaryFallbackTimerRef.current)
            ttsBoundaryFallbackTimerRef.current = null
          }
        }
      }
      return cancel
    } catch {
      setTtsActive(false)
      ttsActiveRef.current = false
      return () => {}
    }
  }, [startProgress, stopProgress])

  const playStep = useCallback(
    async (step: AgentStep) => {
      stopProgress()
      setProgress(0)
      setTtsActive(false)
      ttsActiveRef.current = false
      setState((s) => ({ ...s, status: 'navigating' }))
      await navigateTo(step.page)
      setState((s) => ({ ...s, status: 'playing' }))
      cancelSpeech.current?.()
      cancelSpeech.current = speakText(step.ttsText || step.transcript, step.speakMs ?? 5000)
      audio.play(step.audioUrl).catch(() => {})
    },
    [audio, navigateTo, speakText, stopProgress]
  )

  const start = useCallback(
    async (cfg?: Partial<AgentSessionConfig>) => {
      try {
        audio.stop()
      } catch {}
      cancelSpeech.current?.()
      stopProgress()
      setProgress(0)
      setTtsActive(false)
      ttsActiveRef.current = false
      isAdvancingRef.current = false
      pendingNav.current = null

      setState((s) => ({ ...s, status: 'fetching', error: undefined }))
      try {
        const merged = { ...baseConfig, ...cfg }
        
        // Require lectureId for backend integration
        if (!merged.lectureId) {
          throw new Error('Lecture ID is required. Please upload a PDF first.')
        }
        
        const plan = await fetchAgentPlanFromBackend(merged)
        if (!plan.steps.length) throw new Error('No steps returned')
        setState({ status: 'navigating', currentStepIndex: 0, steps: plan.steps })
        await playStep(plan.steps[0])
      } catch (e: any) {
        setState((s) => ({ ...s, status: 'error', error: e?.message || 'Unknown error' }))
      }
    },
    [audio, baseConfig, playStep, stopProgress]
  )

  const pause = useCallback(() => {
    audio.pause()
    try {
      const synth = window.speechSynthesis
      if (synth && synth.speaking && !synth.paused) synth.pause()
    } catch {}
    if (!ttsBoundarySeenRef.current) {
      if (progressPausedAt.current == null) {
        progressPausedAt.current = performance.now()
      }
      if (progressTimer.current) {
        cancelAnimationFrame(progressTimer.current)
        progressTimer.current = null
      }
    }
    setState((s) => ({ ...s, status: 'paused' }))
  }, [audio])

  const skipTo = useCallback(
    async (index: number) => {
      const steps = state.steps
      if (index < 0 || index >= steps.length) return
      audio.stop()
      cancelSpeech.current?.()
      stopProgress()
      setProgress(0)
      setState((s) => ({ ...s, currentStepIndex: index }))
      await playStep(steps[index])
    },
    [audio, playStep, state.steps, stopProgress]
  )

  const resume = useCallback(() => {
    audio.resume()
    try {
      const synth = window.speechSynthesis
      if (synth && synth.paused) synth.resume()
    } catch {}
    if (!ttsBoundarySeenRef.current) {
      if (progressPausedAt.current != null) {
        progressPauseAccum.current += performance.now() - progressPausedAt.current
        progressPausedAt.current = null
      }
      if (!progressTimer.current && progress < 1) {
        progressTimer.current = requestAnimationFrame(tickProgress)
      }
    }
    if (nextAfterPromptRef.current && pendingNextIndexRef.current != null) {
      const idx = pendingNextIndexRef.current
      nextAfterPromptRef.current = false
      pendingNextIndexRef.current = null
      skipTo(idx)
      return
    }
    setState((s) => ({ ...s, status: 'playing' }))
  }, [audio, progress, tickProgress, skipTo])

  const stop = useCallback(() => {
    audio.stop()
    stopProgress()
    setProgress(0)
    cancelSpeech.current?.()
    setState({ status: 'stopped', currentStepIndex: -1, steps: [] })
  }, [audio, stopProgress])

  const jumpTo = useCallback(async (index: number) => {
    userSkipRef.current = true
    await skipTo(index)
  }, [skipTo])

  useEffect(() => {
    if (state.status !== 'playing' || progress < 1 || ttsActive) return
    if (userSkipRef.current) return
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true
    ;(async () => {
      try { pause() } catch {}
      try {
        postSlidePromptRef.current?.('Do you understand?')
      } catch {}
      const next = state.currentStepIndex + 1
      if (next < state.steps.length) {
        nextAfterPromptRef.current = true
        pendingNextIndexRef.current = next
      } else {
        stop()
      }
    })().finally(() => {
      isAdvancingRef.current = false
    })
  }, [progress, ttsActive, state.status, state.currentStepIndex, state.steps.length, pause, stop])

  useEffect(() => {
    postSlidePromptRef.current = opts?.onPrompt ?? null
    return () => { 
      postSlidePromptRef.current = null 
    }
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
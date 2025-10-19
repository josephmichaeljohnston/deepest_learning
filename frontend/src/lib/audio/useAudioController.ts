'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface AudioController {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  error?: string
  duration: number
  currentTime: number
  play: (url: string, statusUrl?: string) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
}

// Helper function to poll for audio readiness
async function waitForAudioReady(statusUrl: string, maxWaitMs: number = 30000): Promise<boolean> {
  const pollIntervalMs = 200
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(statusUrl)
      if (!res.ok) {
        console.warn('[waitForAudioReady] Status check returned:', res.status)
        await new Promise((r) => setTimeout(r, pollIntervalMs))
        continue
      }

      const data = await res.json()
      console.log('[waitForAudioReady] Audio status:', data.status, 'ready:', data.ready)

      if (data.ready === true) {
        return true
      }

      if (data.status === 'error' || data.status === 'not_found') {
        throw new Error(`Audio generation failed: ${data.status}`)
      }

      // Still generating, wait and retry
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    } catch (e: any) {
      console.error('[waitForAudioReady] Error checking status:', e?.message)
      throw e
    }
  }

  throw new Error(`Audio not ready after ${maxWaitMs}ms`)
}

// No audio fallbacks; require valid stream/URL from backend

export function useAudioController(): AudioController {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<AudioController['status']>('idle')
  const [error, setError] = useState<string | undefined>(undefined)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = new Audio()
    // Enable preloading to allow HTTPAudioElement to request ranges
    audio.preload = 'auto'
    audioRef.current = audio

    const onLoaded = () => {
      console.log('[useAudioController] Metadata loaded. Duration:', audio.duration)
      setDuration(audio.duration || 0)
    }
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      console.log('[useAudioController] Audio ended')
      setStatus('idle')
    }
    const onError = () => {
      const errorMsg = `Audio error: ${audio.error?.message || 'Unknown error'}`
      console.error('[useAudioController]', errorMsg)
      setStatus('error')
      setError(errorMsg)
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [])

  const play = useCallback(async (url: string, statusUrl?: string) => {
    const audio = audioRef.current
    if (!audio) {
      console.error('[useAudioController] Audio element not ready')
      return
    }
    setError(undefined)
    setStatus('loading')
    console.log('[useAudioController] Loading audio from:', url)
    audio.pause()
    audio.src = url
    
    // If statusUrl provided, wait for backend to signal audio is ready
    if (statusUrl) {
      console.log('[useAudioController] Waiting for audio to be ready via:', statusUrl)
      try {
        await waitForAudioReady(statusUrl)
        console.log('[useAudioController] Audio is ready, starting playback')
      } catch (e: any) {
        console.error('[useAudioController] Audio never became ready:', e?.message)
        setStatus('error')
        setError(e?.message || 'Audio generation timeout')
        return
      }
    }

    // Try to play
    try {
      await audio.play()
      console.log('[useAudioController] Audio playing successfully')
      setStatus('playing')
    } catch (e: any) {
      console.error('[useAudioController] Playback failed:', e?.message || e)
      setStatus('error')
      const msg = e?.message || 'Audio playback failed'
      setError(msg)
    }
  }, [])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.play().then(() => setStatus('playing')).catch(() => setStatus('error'))
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setStatus('idle')
  }, [])

  return useMemo(
    () => ({ status, error, duration, currentTime, play, pause, resume, stop }),
    [status, error, duration, currentTime, play, pause, resume, stop]
  )
}

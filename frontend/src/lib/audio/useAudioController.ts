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

// Helper: Poll the audio URL itself until it's available (no status route needed)
async function waitForAudioAvailable(audioUrl: string, maxWaitMs: number = 120000): Promise<void> {
  const pollIntervalMs = 500
  const startTime = Date.now()

  while (true) {
    // Optional timeout: if you truly want to wait indefinitely, remove this block
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Audio not ready after ${Math.round(maxWaitMs / 1000)}s`)
    }

    try {
      // Request only the first byte to keep the response tiny when available
      const res = await fetch(audioUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
      })

      if (res.ok || res.status === 206) {
        return
      }

      // 404 means not generated yet; wait and retry
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    } catch (e) {
      // Network hiccup; brief backoff and retry
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
  }
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
    // Helpful buffering logs similar to provided snippet
    const onProgress = () => {
      console.log('[useAudioController] Buffering...', audio.buffered.length, 'ranges')
    }
    const onCanPlay = () => {
      console.log('[useAudioController] Can start playing!')
    }
    audio.addEventListener('progress', onProgress)
    audio.addEventListener('canplay', onCanPlay)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('progress', onProgress)
      audio.removeEventListener('canplay', onCanPlay)
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
    // If using a stream endpoint, skip polling and assign src immediately
    const isStream = url.includes('/audio-stream/')
    if (!isStream) {
      // Wait until the backend serves the audio file (poll the same URL)
      try {
        await waitForAudioAvailable(url)
        console.log('[useAudioController] Audio is ready, starting playback')
      } catch (e: any) {
        console.error('[useAudioController] Audio never became ready:', e?.message)
        setStatus('error')
        setError(e?.message || 'Audio generation timeout')
        return
      }
    }

    audio.src = url

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

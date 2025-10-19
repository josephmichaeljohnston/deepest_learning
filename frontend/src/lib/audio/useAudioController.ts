'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface AudioController {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  error?: string
  duration: number
  currentTime: number
  play: (url: string) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
}

// Tiny pre-generated wav beep (approx 0.2s). Kept as base64 for reliability and to avoid CORS.
const BEEP_DATA_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQwAAAABAQH///8='

export function useAudioController(): AudioController {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<AudioController['status']>('idle')
  const [error, setError] = useState<string | undefined>(undefined)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onLoaded = () => setDuration(audio.duration || 0)
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => setStatus('idle')
    const onError = () => {
      setStatus('error')
      setError('Failed to load audio')
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

  const play = useCallback(async (url: string) => {
    const audio = audioRef.current
    if (!audio) return
    setError(undefined)
    setStatus('loading')
    audio.pause()
    audio.src = url
    try {
      await audio.play()
      setStatus('playing')
    } catch (e) {
      // Try the data beep fallback if autoplay restrictions or CORS issues occur
      try {
        audio.src = BEEP_DATA_URI
        await audio.play()
        setStatus('playing')
      } catch (e2) {
        setStatus('error')
        setError('Audio playback failed')
      }
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

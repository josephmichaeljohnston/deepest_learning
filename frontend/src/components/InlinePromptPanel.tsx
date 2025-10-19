'use client'

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { AgentControllerApi } from '@/lib/agent/useAgentController'

export type InlinePromptPanelHandle = {
  prompt: (message?: string) => void
}

type Props = {
  agent: AgentControllerApi
}

const InlinePromptPanel = forwardRef<InlinePromptPanelHandle, Props>(function InlinePromptPanel({ agent }: Props, ref) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState<string>('Any questions?')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<string | null>(null)
  const [isAgentPrompted, setIsAgentPrompted] = useState(false)  // Track if opened by agent
  const [waiting, setWaiting] = useState(false) // Show overlay while waiting on server/next slide

  const openPanel = (message?: string) => {
    console.log('[InlinePromptPanel] openPanel called with message:', message)
    if (message && message.trim().length > 0) setTitle(message)
    else setTitle('Do you understand?')
    try { 
      console.log('[InlinePromptPanel] Pausing agent before showing panel')
      agent.pause() 
    } catch (e) { 
      console.error('[InlinePromptPanel] Error pausing agent:', e) 
    }
    setError(null)
    setResponse(null)
    setOpen(true)
    setIsAgentPrompted(true)  // Opened by agent prompt
    console.log('[InlinePromptPanel] Panel opened')
  }

  const openPanelManually = () => {
    console.log('[InlinePromptPanel] openPanelManually called')
    console.log('[InlinePromptPanel] Agent status:', agent.state.status)
    setTitle('Any questions?')
    // Only pause if agent is currently playing
    if (agent.state.status === 'playing') {
      try { 
        console.log('[InlinePromptPanel] Pausing agent before showing panel')
        agent.pause() 
      } catch (e) { 
        console.error('[InlinePromptPanel] Error pausing agent:', e) 
      }
    }
    setError(null)
    setResponse(null)
    setOpen(true)
    setIsAgentPrompted(false)  // Opened by user
    console.log('[InlinePromptPanel] Panel opened manually')
  }

  useImperativeHandle(ref, () => ({
    prompt: (message?: string) => {
      console.log('[InlinePromptPanel] prompt method called (via ref) with message:', message)
      openPanel(message)
    }
  }))

  const closePanel = () => {
    console.log('[InlinePromptPanel] closePanel called')
    console.log('[InlinePromptPanel] Agent status:', agent.state.status)
    setOpen(false)
    setValue('')
    setError(null)
    setResponse(null)
    setIsAgentPrompted(false)
    // Only resume if agent is paused
    if (agent.state.status === 'paused') {
      try {
        console.log('[InlinePromptPanel] Resuming/advancing agent on close')
        // If this panel was agent-prompted (end-of-slide question), treat close as Skip
        if (isAgentPrompted && typeof (agent as any).next === 'function') {
          setWaiting(true)
          ;(agent as any).next()
        } else {
          agent.resume()
        }
      } catch (e) {
        console.error('[InlinePromptPanel] Error resuming agent on close:', e)
      }
    }
  }

  const onSubmit = async () => {
    if (!value.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      // Determine context
      const search = new URLSearchParams(window.location.search)
      const lecture = search.get('lecture')
      const slide = String(agent.currentStep?.page ?? '')
      if (!lecture || !slide) throw new Error('Missing lecture/slide context')

      let res: Response
      if (isAgentPrompted) {
        // Agent prompted: user is answering the slide question -> send to /answer
        const url = `/api/backend/lectures/answer/${encodeURIComponent(lecture)}/${encodeURIComponent(slide)}`
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: value }),
        })
        if (!res.ok) throw new Error('Failed to submit answer')
        const data = await res.json()
        // Backend returns feedback/correct/hypothesis
        setResponse(data.feedback ?? JSON.stringify(data))
      } else {
        // Manual user question: forward to user-question endpoint which returns an answer
        const url = `/api/backend/lectures/user-question/${encodeURIComponent(lecture)}/${encodeURIComponent(slide)}`
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: value }),
        })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          throw new Error(t || 'Failed to submit question')
        }
        const data = await res.json()
        if (!data?.answer) throw new Error('No answer returned from backend')
        setResponse(data.answer)
        // Log hypothesis update from a question to the history (no audio playback)
        try {
          ;(agent as any).logQuestionHypothesis?.({ hypothesis: data.hypothesis, hypothesisUse: data.hypothesis_use })
        } catch {}
      }
      // For agent-prompted answers, auto-advance after a short delay; for user questions keep panel open to display the answer
      if (isAgentPrompted) {
        setTimeout(() => {
          setOpen(false)
          setValue('')
          try {
            // Show waiting overlay while advancing to the next slide after answering
            setWaiting(true)
            agent.resume()
          } catch {}
        }, 400)
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Hide waiting overlay once the agent starts playing (or if a terminal state occurs)
  React.useEffect(() => {
    if (!waiting) return
    let cancelled = false
    const started = Date.now()
    const clear = () => { if (!cancelled) setWaiting(false) }
    const interval = setInterval(() => {
      const st = agent.state.status
      if (st === 'playing' || st === 'error' || st === 'stopped' || st === 'completed') {
        clear()
      } else if (Date.now() - started > 45000) {
        // Fail-safe after 45s
        clear()
      }
    }, 150)
    return () => { cancelled = true; clearInterval(interval) }
  }, [waiting, agent.state.status])

  return (
    <div className="w-full flex flex-col items-center">
      {/* Waiting overlay */}
      {waiting && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40">
          <div className="px-4 py-3 rounded-lg bg-white shadow flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-600 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            <span className="text-sm font-medium text-gray-800">Loading</span>
          </div>
        </div>
      )}
      {/* Collapsed control bar - Centered */}
      {!open && (
        <button
          onClick={() => openPanelManually()}
          className="px-6 py-3 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors text-base"
        >
          Ask a question
        </button>
      )}

      {/* Sliding panel */}
      <div
        className={`mt-3 transition-all duration-300 w-full max-w-2xl ${open ? 'max-h-[65vh] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        <div className="rounded-xl border border-amber-200 bg-white">
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          </div>
          <div className="px-4 py-4">
            <label htmlFor="inline-qa-input" className="block text-sm font-medium text-gray-700 mb-2">
              {isAgentPrompted ? 'Your answer' : 'Your question'}
            </label>
            <textarea
              id="inline-qa-input"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={isAgentPrompted ? 'Type your answer…' : 'Type your question…'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {response && (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">Answer</div>
                <div className="mt-1 text-sm text-amber-900 whitespace-pre-wrap">{response}</div>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t flex items-center justify-end gap-2 bg-gray-50 sticky bottom-0">
            <button
              onClick={closePanel}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={loading}
            >
              {isAgentPrompted ? 'Skip' : 'Cancel'}
            </button>
            {/* When a user question has an answer, show OK to close & resume; otherwise show Send */}
            {!isAgentPrompted && response && (
              <button
                onClick={closePanel}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                disabled={loading}
              >
                OK
              </button>
            )}
            {(!response || isAgentPrompted) && (
              <button
                onClick={onSubmit}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                disabled={loading || !value.trim()}
              >
                {loading ? 'Sending…' : 'Send'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export default InlinePromptPanel

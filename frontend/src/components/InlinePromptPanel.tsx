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
        console.log('[InlinePromptPanel] Resuming agent on close')
        agent.resume()
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
      const url = new URL('/api/qa', window.location.origin)
      // Try to pass context to backend
      const search = new URLSearchParams(window.location.search)
      const lecture = search.get('lecture')
      const slide = String(agent.currentStep?.page ?? '')
      if (lecture) url.searchParams.set('lecture', lecture)
      if (slide) url.searchParams.set('slide', slide)
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: value })
      })
      if (!res.ok) throw new Error('Failed to submit question')
      const data = await res.json()
      if (!data?.answer) {
        throw new Error('No answer returned from backend')
      }
      setResponse(data.answer)
      // Close after short delay and clear input, then resume agent
      setTimeout(() => {
        setOpen(false)
        setValue('')
        // Automatically resume the agent to continue to next slide
        try {
          agent.resume()
        } catch {}
      }, 400)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
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
        className={`mt-3 overflow-hidden transition-all duration-300 w-full max-w-2xl ${open ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="rounded-xl border border-amber-200 bg-white">
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          </div>
          <div className="px-4 py-4">
            <label htmlFor="inline-qa-input" className="block text-sm font-medium text-gray-700 mb-2">Your response</label>
            <textarea
              id="inline-qa-input"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Type here…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {response && <p className="mt-2 text-sm text-green-700">{response}</p>}
          </div>
          <div className="px-4 py-3 border-t flex items-center justify-end gap-2 bg-gray-50">
            <button
              onClick={closePanel}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={loading}
            >
              {isAgentPrompted ? 'No questions' : 'Cancel'}
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
              disabled={loading || !value.trim()}
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default InlinePromptPanel

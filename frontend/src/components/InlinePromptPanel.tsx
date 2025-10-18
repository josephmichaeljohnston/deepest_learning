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
  const [title, setTitle] = useState<string>('Do you understand?')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<string | null>(null)

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
    console.log('[InlinePromptPanel] Panel opened')
  }

  useImperativeHandle(ref, () => ({
    prompt: (message?: string) => {
      console.log('[InlinePromptPanel] prompt method called (via ref) with message:', message)
      openPanel(message)
    }
  }))

  const closePanel = () => {
    setOpen(false)
  }

  const onSubmit = async () => {
    if (!value.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: value })
      })
      if (!res.ok) throw new Error('Failed to submit question')
      const data = await res.json()
      setResponse(data.answer || 'Received. Thank you!')
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
    <div className="w-full">
      {/* Collapsed control bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M9 2a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4 1a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm4 2a1 1 0 0 1 1 1v6.5a5.5 5.5 0 1 1-11 0V9a1 1 0 1 1 2 0v3.5a3.5 3.5 0 1 0 7 0V6a1 1 0 0 1 1-1ZM5.5 9A1.5 1.5 0 0 1 7 10.5v1a1 1 0 1 1-2 0v-1C5 10.12 5.22 9.78 5.54 9.6c-.02-.2-.04-.4-.04-.6 0-.38.08-.75.22-1.08C6.03 6.96 6.95 6.3 8 6.08V7a1 1 0 0 1-1 1c-.83 0-1.5.67-1.5 1Z"/>
            </svg>
          </span>
          <span className="text-sm">Questions and responses</span>
        </div>
        <button
          onClick={() => (open ? closePanel() : openPanel())}
          className="px-3 py-1 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700"
        >
          {open ? 'Hide' : 'Ask / Respond'}
        </button>
      </div>

      {/* Sliding panel */}
      <div
        className={`mt-3 overflow-hidden transition-all duration-300 ${open ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="rounded-xl border border-amber-200 bg-white">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            <button onClick={closePanel} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
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
              Cancel
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

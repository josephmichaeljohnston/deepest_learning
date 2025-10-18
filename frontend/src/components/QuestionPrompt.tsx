'use client'

import React, { useImperativeHandle, useRef, useState, forwardRef } from 'react'
import type { AgentControllerApi } from '@/lib/agent/useAgentController'

export type QuestionPromptHandle = {
  prompt: (message?: string) => void
}

type Props = {
  agent: AgentControllerApi
  inline?: boolean
}

const QuestionPrompt = forwardRef<QuestionPromptHandle, Props>(function QuestionPrompt({ agent, inline = false }: Props, ref) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<string | null>(null)
  const [title, setTitle] = useState<string>('Ask a question')

  const onOpen = () => {
    try { agent.pause() } catch {}
    setResponse(null)
    setError(null)
    setOpen(true)
  }
  const onClose = () => {
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
      setResponse(data.answer || 'Thanks!')
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Expose imperative prompt(message?) so agent can request input after slides
  useImperativeHandle(ref, () => ({
    prompt: (message?: string) => {
      if (message && message.trim().length > 0) setTitle(message)
      else setTitle('Ask a question')
      onOpen()
    }
  }))

  return (
    <>
      {/* Hand Raise Button: inline under slides or floating */}
      <button
        onClick={onOpen}
        title="Raise hand"
        className={(inline
          ? 'h-12 w-12 rounded-full shadow bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors'
          : 'fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors')}
      >
        {/* Sleek hand-raise icon (inline SVG) */}
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="drop-shadow-sm">
          <path fill="currentColor" d="M9 2a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4 1a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm4 2a1 1 0 0 1 1 1v6.5a5.5 5.5 0 1 1-11 0V9a1 1 0 1 1 2 0v3.5a3.5 3.5 0 1 0 7 0V6a1 1 0 0 1 1-1ZM5.5 9A1.5 1.5 0 0 1 7 10.5v1a1 1 0 1 1-2 0v-1C5 10.12 5.22 9.78 5.54 9.6c-.02-.2-.04-.4-.04-.6 0-.38.08-.75.22-1.08C6.03 6.96 6.95 6.3 8 6.08V7a1 1 0 0 1-1 1c-.83 0-1.5.67-1.5 1Z"/>
        </svg>
      </button>

      {/* Backdrop + Panel */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
          <div className="relative w-full sm:max-w-lg mx-4 mb-6 sm:mx-0 sm:mb-0 bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="currentColor" d="M9 2a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4 1a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm4 2a1 1 0 0 1 1 1v6.5a5.5 5.5 0 1 1-11 0V9a1 1 0 1 1 2 0v3.5a3.5 3.5 0 1 0 7 0V6a1 1 0 0 1 1-1ZM5.5 9A1.5 1.5 0 0 1 7 10.5v1a1 1 0 1 1-2 0v-1C5 10.12 5.22 9.78 5.54 9.6c-.02-.2-.04-.4-.04-.6 0-.38.08-.75.22-1.08C6.03 6.96 6.95 6.3 8 6.08V7a1 1 0 0 1-1 1c-.83 0-1.5.67-1.5 1Z"/>
                  </svg>
                </span>
                <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <span className="sr-only">Close</span>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7a1 1 0 0 0-1.4-1.4L12 9.17 7.1 4.3a1 1 0 1 0-1.4 1.4L10.83 12l-5.13 4.9a1 1 0 0 0 1.4 1.45L12 14.83l4.9 5.12a1 1 0 0 0 1.4-1.45L13.17 12l5.12-4.9Z"/></svg>
              </button>
            </div>
            <div className="px-4 py-4">
              <label htmlFor="qa-input" className="block text-sm font-medium text-gray-700 mb-2">Your question or response</label>
              <textarea
                id="qa-input"
                rows={4}
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
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onSubmit()
                  // Close on successful submission
                  if (!error) {
                    setOpen(false)
                    setValue('')
                  }
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                disabled={loading || !value.trim()}
              >
                {loading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

export default QuestionPrompt

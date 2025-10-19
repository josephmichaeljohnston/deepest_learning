'use client'

import { useEffect, useState } from 'react'
import { AgentControllerApi } from '@/lib/agent/useAgentController'
import AgentControlPanel from './AgentControlPanel'
import { onApiLog, getApiLogs } from '@/lib/dev/apiLog'

interface DevControlsSidebarProps {
  agent: AgentControllerApi
  ready: boolean
  lectureId?: string | null
  currentPage: number
  totalPages: number
  loadError: string | null
}

export default function DevControlsSidebar({
  agent,
  ready,
  lectureId,
  currentPage,
  totalPages,
  loadError,
}: DevControlsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [apiLogs, setApiLogs] = useState(() => getApiLogs())

  // Subscribe to API log events
  useEffect(() => {
    const off = onApiLog((entry) => {
      setApiLogs((prev) => {
        const next = [...prev, entry]
        if (next.length > 200) next.shift()
        return next
      })
    })
    return () => { off() }
  }, [])

  return (
    <>
      {/* Burger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        aria-label="Toggle developer panel"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-80 bg-white shadow-2xl z-40 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6">
          {/* Header */}
          <div className="px-6 flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Developer Panel</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close developer panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* State Section */}
          <div className="px-6 mb-6 pb-6 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">State</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-gray-600">Page</dt>
                <dd className="font-mono font-semibold text-gray-900">{currentPage}/{totalPages}</dd>
              </dl>
              {(loadError || agent.state.error) && (
                <div className="mt-3 space-y-1">
                  {loadError && (
                    <div className="text-xs rounded border border-orange-200 bg-orange-50 px-2 py-1 text-orange-700">{loadError}</div>
                  )}
                  {agent.state.error && (
                    <div className="text-xs rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">{agent.state.error}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* API Logs */}
          <div className="px-6 mb-6 pb-6 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">API calls</h3>
            <div className="space-y-1 max-h-48 overflow-auto text-xs font-mono">
              {apiLogs.length === 0 && <div className="text-gray-500">No calls yet</div>}
              {apiLogs.slice(-30).reverse().map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={`px-1 rounded ${e.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.status ?? 'ERR'}</span>
                  <span className="text-gray-700">{e.method}</span>
                  <span className="truncate flex-1" title={e.url}>{e.url}</span>
                  {typeof e.durationMs === 'number' && <span className="text-gray-500">{e.durationMs}ms</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Hypotheses (history) */}
          {agent.state.steps?.some((s) => !!s.hypothesis || !!s.hypothesisUse) && (
            <div className="px-6 mb-6 pb-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Hypotheses</h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {agent.state.steps
                  .filter((s) => !!s.hypothesis || !!s.hypothesisUse)
                  .slice(-20)
                  .reverse()
                  .map((s, idx) => (
                    <div key={`${s.page}-${idx}`} className="rounded border border-amber-200 bg-amber-50 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-amber-900">
                          {s.source === 'question' ? `Question ${s.questionIndex ?? ''}`.trim() : `Slide ${s.page}`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">Hypothesis</div>
                          <p className="text-xs text-amber-900 whitespace-pre-wrap">{s.hypothesis || '—'}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">Use</div>
                          <p className="text-xs text-amber-900 whitespace-pre-wrap">{s.hypothesisUse || '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Agent Controls Section */}
          <div className="px-6 pt-6 pb-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Agent Controls</h3>
            <div className="space-y-2">
              <AgentControlPanel agent={agent} ready={!!lectureId && ready} />
              {!lectureId && (
                <div className="text-xs text-gray-500">Backend not connected — agent disabled.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { AgentControllerApi } from '@/lib/agent/useAgentController'
import AgentControlPanel from './AgentControlPanel'
import { onApiLog, getApiLogs } from '@/lib/dev/apiLog'

interface DevControlsSidebarProps {
  agent: AgentControllerApi
  ready: boolean
  currentPage: number
  totalPages: number
  loadError: string | null
  programmaticNextPage: () => void
  programmaticPrevPage: () => void
  programmaticGoToPage: (page: number) => void
  jumpPage: string
  setJumpPage: (page: string) => void
}

export default function DevControlsSidebar({
  agent,
  ready,
  currentPage,
  totalPages,
  loadError,
  programmaticNextPage,
  programmaticPrevPage,
  programmaticGoToPage,
  jumpPage,
  setJumpPage,
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
        aria-label="Toggle dev menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-80 bg-white shadow-2xl z-40 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Dev Controls</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Status Section */}
            <div className="mb-6 pb-6 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-600">Page:</span>
                <span className="ml-2 font-mono font-semibold text-gray-900">
                  {currentPage}/{totalPages}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Agent:</span>
                <span className="ml-2 font-mono font-semibold text-gray-900">
                  {agent.state.status}
                </span>
              </div>
              {loadError && (
                <div className="text-orange-600 mt-2">{loadError}</div>
              )}
              {agent.state.error && (
                <div className="text-red-600 mt-2">{agent.state.error}</div>
              )}
            </div>

            {/* API Logs */}
            <div className="mb-6 pb-6 border-b">
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
          </div>

          {/* Manual Navigation Section */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Manual Navigation
            </h3>
            <div className="space-y-2">
              <button
                onClick={programmaticPrevPage}
                disabled={!ready || currentPage <= 1}
                className="w-full px-3 py-2 text-sm bg-gray-200 text-gray-900 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  disabled={!ready}
                  placeholder="Jump to page"
                  className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={() => {
                    const page = parseInt(jumpPage, 10)
                    if (!isNaN(page)) {
                      programmaticGoToPage(page)
                      setJumpPage('')
                    }
                  }}
                  disabled={!ready || !jumpPage}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Go
                </button>
              </div>

              <button
                onClick={programmaticNextPage}
                disabled={!ready || currentPage >= totalPages}
                className="w-full px-3 py-2 text-sm bg-gray-200 text-gray-900 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Agent Controls Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Agent Controls
            </h3>
            <div className="space-y-2">
              <AgentControlPanel agent={agent} ready={ready} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

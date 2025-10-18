'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import type { PdfCarouselRef } from '@/components/PdfCarousel'
import AgentControlPanel from '@/components/AgentControlPanel'
import { useAgentController } from '@/lib/agent/useAgentController'
import type { AgentSessionConfig } from '@/lib/agent/types'

export const dynamic = 'force-dynamic'

// Dynamically import PdfCarousel to avoid SSR issues
const PdfCarousel = nextDynamic(() => import('@/components/PdfCarousel'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[600px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Loading PDF viewer...</p>
    </div>
  ),
})

function ViewerPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pdfCarouselRef = useRef<PdfCarouselRef>(null)
  
  const filename = searchParams.get('file')
  const mode = searchParams.get('mode')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [disableControls, setDisableControls] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [jumpPage, setJumpPage] = useState<string>('')
  const [controlledPage, setControlledPage] = useState<number | undefined>(undefined)
  
  // Agent controller setup (simulated API plan + audio playback)
  const agentBaseConfig = useMemo<AgentSessionConfig>(() => ({
    filename: decodeURIComponent(filename || ''),
    totalPages: totalPages || 0,
    pdfUrl: pdfUrl || undefined,
  }), [filename, totalPages, pdfUrl])
  const agent = useAgentController(pdfCarouselRef, agentBaseConfig, { navigate: (p) => programmaticGoToPage(p) })

  useEffect(() => {
    // Redirect if no filename provided
    if (!filename) {
      router.push('/')
      return
    }

    // Check if we're in local mode (backend not ready)
    if (mode === 'local') {
      const localFileUrl = sessionStorage.getItem('pdfFileUrl')
      if (localFileUrl) {
        setPdfUrl(localFileUrl)
      } else {
        router.push('/')
      }
    } else {
      // Use the API endpoint; ensure filename is URL-encoded for safe path usage
      setPdfUrl(`/api/pdf/${encodeURIComponent(filename)}`)
    }
  }, [filename, mode, router])

  const handlePageChange = (current: number, total: number) => {
    setCurrentPage(current)
    setTotalPages(total)
  }

  const handleDocumentLoad = (numPages: number) => {
    setTotalPages(numPages)
    console.log(`PDF loaded with ${numPages} pages`)
    setLoadError(null)
  }

  const handleDocumentLoadError = (error: Error) => {
    console.error('Viewer load error:', error)
    setLoadError('Failed to load from server')
    // Attempt fallback to local sessionStorage if present and not already in local mode
    if (mode !== 'local') {
      const localFileUrl = sessionStorage.getItem('pdfFileUrl')
      if (localFileUrl) {
        setPdfUrl(localFileUrl)
      }
    }
  }

  // Programmatic control functions (using carousel ref)
  const programmaticNextPage = () => {
    const ready = totalPages > 0 && !disableControls
    if (!ready) {
      console.log('ProgrammaticNext blocked:', { totalPages, disableControls })
      return
    }
    setControlledPage(Math.min(currentPage + 1, totalPages))
  }

  const programmaticPrevPage = () => {
    const ready = totalPages > 0 && !disableControls
    if (!ready) {
      console.log('ProgrammaticPrev blocked:', { totalPages, disableControls })
      return
    }
    setControlledPage(Math.max(currentPage - 1, 1))
  }

  const programmaticGoToPage = (page: number) => {
    const ready = totalPages > 0 && !disableControls
    if (!ready) {
      console.log('ProgrammaticGoTo blocked:', { page, totalPages, disableControls })
      return
    }
    const clamped = Math.max(1, Math.min(page, totalPages))
    setControlledPage(clamped)
  }

  // Disable manual controls while agent is busy
  useEffect(() => {
    const busy = ['fetching', 'navigating', 'playing'].includes(agent.state.status)
    setDisableControls(busy)
  }, [agent.state.status])

  if (!filename || !pdfUrl) {
    return null
  }

  return (
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">PDF Viewer</h1>
            <p className="text-lg text-gray-600 mt-2">{decodeURIComponent(filename)}</p>
            {mode === 'local' && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Viewing locally (backend not ready)
              </p>
            )}
            <div className="mt-2 text-sm flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${totalPages > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span className="text-gray-600">Viewer {totalPages > 0 ? 'ready' : 'initializing'}</span>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Upload
          </button>
        </div>

        {/* PDF Carousel */}
        <div className="mb-8">
          <PdfCarousel
            ref={pdfCarouselRef}
            pdfUrl={pdfUrl}
            showControls={true}
            disableControls={disableControls}
            onPageChange={handlePageChange}
            onDocumentLoadSuccess={handleDocumentLoad}
            onDocumentLoadError={handleDocumentLoadError}
            externalPage={controlledPage}
          />
        </div>

        {/* Status Display */}
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Document Information
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-gray-600">Current Page:</p>
              <p className="text-2xl font-bold text-blue-600">{currentPage}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Pages:</p>
              <p className="text-2xl font-bold text-blue-600">{totalPages}</p>
            </div>
          </div>

          {loadError && (
            <div className="p-4 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 mb-4">
              {loadError}. If you just uploaded the file, the server might still be warming up; we attempted a local fallback.
            </div>
          )}

          {/* Manual Programmatic Control Panel */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Programmatic Controls (Manual)
            </h3>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={programmaticPrevPage}
                disabled={totalPages === 0 || disableControls || currentPage <= 1}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Previous Page
              </button>
              
              <button
                onClick={programmaticNextPage}
                disabled={totalPages === 0 || disableControls || currentPage >= totalPages}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Next Page
              </button>
              
              <button
                onClick={() => programmaticGoToPage(1)}
                disabled={totalPages === 0 || disableControls}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Go to Page 1
              </button>
              
              <button
                onClick={() => {
                  const page = Math.ceil(totalPages / 2)
                  programmaticGoToPage(page)
                }}
                disabled={totalPages < 2 || disableControls}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Go to Middle
              </button>

              {/* Jump to arbitrary page */}
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                <label htmlFor="jumpPage" className="text-sm text-gray-700">Jump to</label>
                <input
                  id="jumpPage"
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  disabled={totalPages === 0 || disableControls}
                  placeholder="Page #"
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={() => {
                    const n = parseInt(jumpPage, 10)
                    if (!isNaN(n)) {
                      const clamped = Math.max(1, Math.min(n, totalPages))
                      programmaticGoToPage(clamped)
                    }
                  }}
                  disabled={totalPages === 0 || disableControls || jumpPage.trim() === ''}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Go
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Manual Controls:</strong> Use the buttons above for ad-hoc navigation. When the Agent is active, manual controls are disabled. {(totalPages === 0) && (
                  <span className="text-orange-700 ml-1">(Viewer not ready yet)</span>
                )}
              </p>
            </div>
          </div>

          {/* Agentic Controls */}
          <AgentControlPanel agent={agent} ready={totalPages > 0} />
        </div>
      </div>
  )
}

export default function ViewerPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <Suspense
        fallback={
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Preparing viewer…</p>
            </div>
          </div>
        }
      >
        <ViewerPageInner />
      </Suspense>
    </main>
  )
}

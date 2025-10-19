'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import type { PdfCarouselRef } from '@/components/PdfCarousel'
import InlinePromptPanel, { InlinePromptPanelHandle } from '@/components/InlinePromptPanel'
import DevControlsSidebar from '@/components/DevControlsSidebar'
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
  const inlinePromptRef = useRef<InlinePromptPanelHandle>(null)
  
  const filename = searchParams.get('file')
  const lectureId = searchParams.get('lecture')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [disableControls, setDisableControls] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [jumpPage, setJumpPage] = useState<string>('')
  const [controlledPage, setControlledPage] = useState<number | undefined>(undefined)
  
  // Agent controller setup - fetches steps on-demand from backend and plays audio
  const agentBaseConfig = useMemo<AgentSessionConfig>(() => ({
    filename: decodeURIComponent(filename || ''),
    totalPages: totalPages || 0,
    pdfUrl: pdfUrl || undefined,
    lectureId: lectureId ? Number(lectureId) : undefined,
  }), [filename, totalPages, pdfUrl, lectureId])
  // Memoize the agent controller options to ensure stable references
  const agentOptions = useMemo(() => ({
    navigate: (p: number) => {
      console.log('[ViewerPage] navigate callback called for page:', p)
      programmaticGoToPage(p)
    },
    onPrompt: (message?: string) => {
      console.log('[ViewerPage] onPrompt callback called with message:', message)
      console.log('[ViewerPage] inlinePromptRef.current:', inlinePromptRef.current)
      inlinePromptRef.current?.prompt(message || 'Do you understand?')
    }
  }), [totalPages, currentPage])

  const agent = useAgentController(
    pdfCarouselRef,
    agentBaseConfig,
    agentOptions
  )

  useEffect(() => {
    // Redirect if no filename or lecture provided
    if (!filename || !lectureId) {
      router.push('/')
      return
    }

    // Use the API endpoint; ensure filename is URL-encoded for safe path usage
    setPdfUrl(`/api/pdf/${encodeURIComponent(filename)}`)
  }, [filename, lectureId, router])

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
    setLoadError('Failed to load PDF. Backend may be unavailable.')
    // Redirect after a delay so user sees the error message
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }

  // Programmatic control functions (using carousel ref)
  const programmaticNextPage = () => {
    const ready = totalPages > 0
    if (!ready) {
      console.log('ProgrammaticNext blocked:', { totalPages })
      return
    }
    setControlledPage(Math.min(currentPage + 1, totalPages))
  }

  const programmaticPrevPage = () => {
    const ready = totalPages > 0
    if (!ready) {
      console.log('ProgrammaticPrev blocked:', { totalPages })
      return
    }
    setControlledPage(Math.max(currentPage - 1, 1))
  }

  const programmaticGoToPage = (page: number) => {
    const ready = totalPages > 0
    if (!ready) {
      console.log('ProgrammaticGoTo blocked:', { page, totalPages })
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
      <div className="w-screen h-screen bg-gray-50 flex flex-col">
        {/* Dev Controls Sidebar */}
        <DevControlsSidebar
          agent={agent}
          ready={totalPages > 0}
          lectureId={lectureId}
          currentPage={currentPage}
          totalPages={totalPages}
          loadError={loadError}
          programmaticNextPage={programmaticNextPage}
          programmaticPrevPage={programmaticPrevPage}
          programmaticGoToPage={programmaticGoToPage}
          jumpPage={jumpPage}
          setJumpPage={setJumpPage}
        />

        {/* Header - Centered title */}
        <div className="flex justify-center items-center py-2 px-4 relative">
          <h1 className="text-2xl font-bold text-gray-900">Deepest Learning</h1>
          
          <button
            onClick={() => router.push('/')}
            className="absolute right-4 px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* PDF Carousel - Fill available space */}
        <div className="flex-1 px-4 py-4 flex flex-col min-h-0 max-h-full">
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

        {/* Bottom section - Q&A Panel with padding (only if backend lecture present) */}
        <div className="px-4 py-4 flex flex-col items-center justify-center">
          {lectureId ? (
            <InlinePromptPanel ref={inlinePromptRef} agent={agent} />
          ) : (
            <div className="text-sm text-gray-600">Backend not connected. Viewing only.</div>
          )}
        </div>
      </div>
  )
}

export default function ViewerPage() {
  return (
    <main className="w-screen h-screen bg-gray-50">
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

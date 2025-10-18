'use client'

import { useRef, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { PdfCarouselRef } from '@/components/PdfCarousel'

// Dynamically import PdfCarousel to avoid SSR issues
const PdfCarousel = dynamic(() => import('@/components/PdfCarousel'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[600px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Loading PDF viewer...</p>
    </div>
  ),
})

export default function ViewerPage() {
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

  // Example of programmatic control (for AI agent integration)
  const [aiControlEnabled, setAiControlEnabled] = useState(false)

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

  // Programmatic control functions (for AI agent)
  const programmaticNextPage = () => {
    pdfCarouselRef.current?.nextPage()
  }

  const programmaticPrevPage = () => {
    pdfCarouselRef.current?.prevPage()
  }

  const programmaticGoToPage = (page: number) => {
    pdfCarouselRef.current?.goToPage(page)
  }

  const simulateAiControl = async () => {
    setAiControlEnabled(true)
    setDisableControls(true)

    // Example AI control sequence
    await new Promise(resolve => setTimeout(resolve, 1000))
    programmaticGoToPage(1)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    programmaticNextPage()
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    programmaticNextPage()
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    programmaticGoToPage(1)

    setDisableControls(false)
    setAiControlEnabled(false)
  }

  if (!filename || !pdfUrl) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
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

          {/* Programmatic Control Panel */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Programmatic Controls (AI Agent Demo)
            </h3>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={programmaticPrevPage}
                disabled={aiControlEnabled || currentPage <= 1}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Previous Page
              </button>
              
              <button
                onClick={programmaticNextPage}
                disabled={aiControlEnabled || currentPage >= totalPages}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Next Page
              </button>
              
              <button
                onClick={() => programmaticGoToPage(1)}
                disabled={aiControlEnabled}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Go to Page 1
              </button>
              
              <button
                onClick={() => {
                  const page = Math.ceil(totalPages / 2)
                  programmaticGoToPage(page)
                }}
                disabled={aiControlEnabled || totalPages < 2}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                API: Go to Middle
              </button>
              
              <button
                onClick={simulateAiControl}
                disabled={aiControlEnabled || totalPages < 2}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {aiControlEnabled ? 'AI Control Active...' : 'Simulate AI Control'}
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>For AI Integration:</strong> Use the ref methods (nextPage, prevPage, goToPage) 
                to control the carousel programmatically. Controls can be disabled during AI operation 
                using the <code className="bg-white px-1 rounded">disableControls</code> prop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

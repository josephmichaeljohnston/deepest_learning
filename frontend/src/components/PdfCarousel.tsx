'use client'

import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure worker - react-pdf v9 requires explicit setup
// Using version 4.4.168 which is bundled with react-pdf 9.1.1
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`

export interface PdfCarouselRef {
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  getCurrentPage: () => number
  getTotalPages: () => number
}

interface PdfCarouselProps {
  pdfUrl: string
  showControls?: boolean
  disableControls?: boolean
  onPageChange?: (currentPage: number, totalPages: number) => void
  onDocumentLoadSuccess?: (numPages: number) => void
  onDocumentLoadError?: (error: Error) => void
  // Optional externally-controlled page navigation (1-based)
  externalPage?: number
  // How to fit the page in the available space
  fitMode?: 'height' | 'width'
}

const PdfCarousel = forwardRef<PdfCarouselRef, PdfCarouselProps>(
  (
    {
      pdfUrl,
      showControls = true,
      disableControls = false,
      onPageChange,
      onDocumentLoadSuccess,
      onDocumentLoadError,
      externalPage,
      fitMode = 'height',
    },
    ref
  ) => {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
  const [pageHeight, setPageHeight] = useState<number | null>(null)
  const [pageWidth, setPageWidth] = useState<number | null>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)

    // Calculate page height based on available container height
    useEffect(() => {
      const updateNow = () => {
        if (!containerRef.current) return
        const containerHeight = containerRef.current.clientHeight
        const containerWidth = containerRef.current.clientWidth
        const newHeight = Math.max(containerHeight - 12, 0) // 12px breathing room
        const newWidth = Math.max(containerWidth - 12, 0)
        setPageHeight((prev) => (prev !== newHeight ? newHeight : prev))
        setPageWidth((prev) => (prev !== newWidth ? newWidth : prev))
        lastUpdateTimeRef.current = performance.now()
      }

      const scheduleUpdate = () => {
        const now = performance.now()
        const elapsed = now - lastUpdateTimeRef.current

        // Throttle immediate updates to at most ~6fps during animations
        if (elapsed > 160) {
          updateNow()
        }

        // Debounce a trailing update to settle at the final size after animations
        if (resizeTimeoutRef.current) {
          window.clearTimeout(resizeTimeoutRef.current)
        }
        resizeTimeoutRef.current = window.setTimeout(() => {
          updateNow()
        }, 180)
      }

      // Initial measurement
      updateNow()

      const resizeObserver = new ResizeObserver(() => {
        scheduleUpdate()
      })
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
      }

      return () => {
        resizeObserver.disconnect()
        if (resizeTimeoutRef.current) {
          window.clearTimeout(resizeTimeoutRef.current)
        }
      }
    }, [])

    // Expose methods to parent via ref for programmatic control
    useImperativeHandle(ref, () => ({
      nextPage: () => {
        changePage(pageNumber + 1)
      },
      prevPage: () => {
        changePage(pageNumber - 1)
      },
      goToPage: (page: number) => {
        changePage(page)
      },
      getCurrentPage: () => pageNumber,
      getTotalPages: () => numPages,
    }))

    const onDocumentLoad = ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setIsLoading(false)
      setError(null)
      onDocumentLoadSuccess?.(numPages)
      onPageChange?.(1, numPages)
    }

    const handleDocumentLoadError = (error: Error) => {
      console.error('Error loading PDF:', error)
      setError('Failed to load PDF document')
      setIsLoading(false)
      // Bubble error up so parent can implement fallbacks (e.g., local Blob URL)
      onDocumentLoadError?.(error)
    }

    const changePage = (newPage: number) => {
      if (newPage >= 1 && newPage <= numPages && newPage !== pageNumber) {
        setIsTransitioning(true)
        setTimeout(() => {
          setPageNumber(newPage)
          onPageChange?.(newPage, numPages)
          setTimeout(() => setIsTransitioning(false), 150)
        }, 150)
      }
    }

    // Respond to external page requests once document is loaded
    useEffect(() => {
      if (!externalPage || numPages === 0) return
      if (externalPage !== pageNumber) {
        changePage(externalPage)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalPage, numPages])

    const handlePrevPage = () => {
      changePage(pageNumber - 1)
    }

    const handleNextPage = () => {
      changePage(pageNumber + 1)
    }

    const handleGoToPage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const page = parseInt(e.target.value, 10)
      if (!isNaN(page)) {
        changePage(page)
      }
    }

    return (
      <div className="flex flex-col items-center justify-start w-full h-full overflow-hidden" ref={containerRef}>
        {/* PDF Document Display */}
        <div 
          className="rounded-lg shadow bg-white overflow-hidden w-full h-full flex items-center justify-center"
          style={{
            minHeight: '0',
            flex: '1 1 auto',
          }}
        >
          {error ? (
            <div className="p-8 text-center text-red-600">
              <p className="text-lg font-semibold">{error}</p>
              <p className="text-sm mt-2">Please try uploading a different file</p>
            </div>
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center overflow-auto"
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoad}
                onLoadError={handleDocumentLoadError}
                loading={
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading PDF...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  // Fit to selected mode
                  {...(fitMode === 'height'
                    ? { height: pageHeight ?? undefined }
                    : { width: pageWidth ?? undefined }
                  )}
                  className="mx-auto"
                />
              </Document>
            </div>
          )}
        </div>

        {/* Navigation Controls removed - handled by parent page */}
      </div>
    )
  }
)

PdfCarousel.displayName = 'PdfCarousel'

export default PdfCarousel

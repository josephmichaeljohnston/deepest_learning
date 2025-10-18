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
    },
    ref
  ) => {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pageWidth, setPageWidth] = useState<number>(0)
    const [containerHeight, setContainerHeight] = useState<number | null>(null)
    const [containerWidth, setContainerWidth] = useState<number | null>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Calculate optimal page width based on viewport
    useEffect(() => {
      const updatePageWidth = () => {
        if (containerRef.current) {
          // Get container width and subtract padding/margins
          const containerWidth = containerRef.current.clientWidth
          // Use 90% of viewport width, max 1200px for readability
          const maxWidth = Math.min(containerWidth * 0.9, 1200)
          setPageWidth(maxWidth)
        }
      }

      updatePageWidth()
      window.addEventListener('resize', updatePageWidth)
      return () => window.removeEventListener('resize', updatePageWidth)
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
      
      // Set initial container dimensions after first page loads
      setTimeout(() => {
        if (containerRef.current) {
          const canvas = containerRef.current.querySelector('canvas')
          if (canvas) {
            setContainerHeight(canvas.offsetHeight)
            setContainerWidth(canvas.offsetWidth)
          }
        }
      }, 100)
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
      <div className="flex flex-col items-center space-y-4 w-full" ref={containerRef}>
        {/* PDF Document Display */}
        <div 
          className="rounded-lg shadow-lg bg-white overflow-hidden transition-all duration-300"
          style={{
            minHeight: containerHeight ? `${containerHeight}px` : undefined,
            minWidth: containerWidth ? `${containerWidth}px` : undefined,
            maxWidth: containerWidth ? `${containerWidth}px` : undefined,
          }}
        >
          {error ? (
            <div className="p-8 text-center text-red-600">
              <p className="text-lg font-semibold">{error}</p>
              <p className="text-sm mt-2">Please try uploading a different file</p>
            </div>
          ) : (
            <div 
              className="transition-opacity duration-150"
              style={{ opacity: isTransitioning ? 0 : 1 }}
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
                  width={pageWidth || undefined}
                  className="mx-auto"
                />
              </Document>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        {showControls && numPages > 0 && !error && (
          <div className="flex items-center space-x-4 bg-gray-100 p-4 rounded-lg">
            <button
              onClick={handlePrevPage}
              disabled={pageNumber <= 1 || disableControls}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-gray-700">Page</span>
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={handleGoToPage}
                disabled={disableControls}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-gray-700">of {numPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={pageNumber >= numPages || disableControls}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    )
  }
)

PdfCarousel.displayName = 'PdfCarousel'

export default PdfCarousel

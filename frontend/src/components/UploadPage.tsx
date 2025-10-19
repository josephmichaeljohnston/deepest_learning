'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const uploadFile = async (fileToUpload: File) => {
    setUploading(true)
    setMessage('Processing...')

    // Create a temporary URL for the file to use in the viewer
    const fileUrl = URL.createObjectURL(fileToUpload)

    try {
      const formData = new FormData()
      formData.append('file', fileToUpload)

      // Save file to local uploads for viewing
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`File uploaded successfully! Creating lecture...`)
        // Upload to backend
        const backendRes = await fetch('/api/backend/lectures/instantiate-lecture', {
          method: 'POST',
          body: formData,
        })
        if (!backendRes.ok) {
          setMessage('Backend connection failed. Please ensure backend is running.')
          setUploading(false)
          return
        }
        
        const lecture = await backendRes.json()
        console.log('[UploadPage] Lecture created with ID:', lecture.id)
        
        // Navigate to viewer with lecture id (always 1 in single-file system)
        setTimeout(() => {
          try {
            sessionStorage.setItem('pdfFileUrl', fileUrl)
            sessionStorage.setItem('pdfFileName', fileToUpload.name)
          } catch {}
          router.push(`/viewer?file=${encodeURIComponent(data.filename)}&lecture=${encodeURIComponent(String(lecture.id))}`)
        }, 400)
      } else {
        setMessage(`Upload failed. Please try again.`)
        setUploading(false)
      }
    } catch (error) {
      console.log('Upload failed:', error)
      setMessage(`Upload failed. Please try again.`)
      setUploading(false)
    }
  }

  const validateAndUploadFile = (selectedFile: File) => {
    // Check if it's a PDF file
    const allowedTypes = ['application/pdf']
    
    if (allowedTypes.includes(selectedFile.type) || selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(selectedFile)
      setMessage('')
      // Automatically upload the file
      uploadFile(selectedFile)
    } else {
      setFile(null)
      setMessage('Please select a PDF file (.pdf)')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndUploadFile(selectedFile)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      validateAndUploadFile(droppedFile)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : uploading
            ? 'border-gray-400 bg-gray-50'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <input
          id="file-upload"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center min-h-[400px] p-12 ${
            uploading ? 'cursor-wait' : 'cursor-pointer'
          }`}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Uploading...</h2>
              <p className="text-gray-600">Please wait while we process your file</p>
            </>
          ) : file ? (
            <>
              <svg className="w-20 h-20 text-green-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">File Selected</h2>
              <p className="text-lg text-gray-700 mb-1">{file.name}</p>
              <p className="text-sm text-gray-500 mb-4">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-sm text-blue-600 font-medium">Processing automatically...</p>
            </>
          ) : (
            <>
              <svg className="w-20 h-20 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isDragging ? 'Drop your PDF here' : 'Upload PDF File'}
              </h2>
              <p className="text-gray-600 mb-4">
                {isDragging ? 'Release to upload' : 'Drag and drop or click to browse'}
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>PDF files only • Auto-upload on selection</span>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mt-6 p-4 rounded-lg text-center font-medium transition-all ${
            message.includes('successfully') || message.includes('Redirecting')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  )
}

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  children: React.ReactNode
  className?: string
}

export function Alert({ type, children, className = '' }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${typeClasses[type]} ${className}`}>
      {children}
    </div>
  )
}

interface FileInfoProps {
  file: File
  className?: string
}

export function FileInfo({ file, className = '' }: FileInfoProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium text-gray-900 mb-2">File Information:</h3>
      <div className="space-y-1 text-sm text-gray-600">
        <p><span className="font-medium">Name:</span> {file.name}</p>
        <p><span className="font-medium">Size:</span> {formatSize(file.size)}</p>
        <p><span className="font-medium">Type:</span> {file.type}</p>
        <p><span className="font-medium">Last Modified:</span> {new Date(file.lastModified).toLocaleString()}</p>
      </div>
    </div>
  )
}
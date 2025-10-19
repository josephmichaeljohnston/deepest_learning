import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Check if it's a PDF file
    const allowedTypes = ['application/pdf']

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files (.pdf) are allowed' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Calculate hash of the uploaded file
    const fileHash = createHash('sha256').update(buffer).digest('hex')

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Check if a file with the same hash already exists
    try {
      const existingFiles = await readdir(uploadsDir)
      
      for (const existingFilename of existingFiles) {
        if (existingFilename.endsWith('.pdf')) {
          const existingFilePath = join(uploadsDir, existingFilename)
          const existingBuffer = await readFile(existingFilePath)
          const existingHash = createHash('sha256').update(existingBuffer).digest('hex')
          
          if (existingHash === fileHash) {
            // File already exists, return existing file info
            console.log(`Duplicate file detected. Using existing: ${existingFilename}`)
            return NextResponse.json({
              message: 'File already exists, using existing upload',
              filename: existingFilename,
              filepath: `/api/pdf/${existingFilename}`,
              size: existingBuffer.length,
              type: file.type,
              isDuplicate: true,
            })
          }
        }
      }
    } catch (readError) {
      console.log('No existing files to check or error reading:', readError)
    }
    
    // Save the file with hash prefix for easy identification
    const filename = `${Date.now()}-${file.name}`
    const filepath = join(uploadsDir, filename)
    
    await writeFile(filepath, buffer)

    return NextResponse.json({
      message: 'File uploaded successfully',
      filename,
      filepath: `/api/pdf/${filename}`,
      size: file.size,
      type: file.type,
      isDuplicate: false,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
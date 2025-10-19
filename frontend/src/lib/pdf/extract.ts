'use client'

import { pdfjs } from 'react-pdf'

export async function extractPageText(pdfUrl: string, pageNumber: number): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument(pdfUrl)
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((it: any) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text
  } catch (e) {
    console.warn('PDF text extraction failed:', e)
    return ''
  }
}

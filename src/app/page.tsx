import UploadPage from '@/components/UploadPage'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          PowerPoint Processor
        </h1>
        <p className="text-lg text-center mb-12 text-gray-600">
          Upload your PowerPoint files to process them with OpenAI
        </p>
        <UploadPage />
      </div>
    </main>
  )
}
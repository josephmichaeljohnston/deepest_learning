import UploadPage from '@/components/UploadPage'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="relative inline-block text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            <span className="relative z-10 glow-text">Deepest Learning</span>
            <span aria-hidden="true" className="absolute left-0 bottom-1 h-3 w-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-fuchsia-500/30 rounded-md animate-gradient"></span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Dynamic lectures powered by AI. Improve your learning experience.
          </p>
        </div>
        <UploadPage />
      </div>
    </main>
  )
}
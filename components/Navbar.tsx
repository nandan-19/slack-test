// components/Navbar.tsx
import AuthButton from '@/components/AuthButton'
import { auth } from '@/auth'

export default async function Navbar() {
  const session = await auth()

  return (
    <header className="relative bg-white/85 backdrop-blur-lg border-b border-amber-200/40 shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {session?.user && (
              <button
                onClick={() => (window.location.href = "/connectors")}
                className="flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors bg-gradient-to-r from-amber-50/80 to-rose-50/60 px-4 py-2 rounded-xl border border-rose-200/50 hover:border-rose-300/60"
              >
                ← Back
              </button>
            )}
            
            <div className="flex items-center space-x-6">
              <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 via-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-sm transform rotate-3"></div>
                  <div className="relative bg-white/90 rounded-sm px-2 py-1 shadow-inner">
                    <span className="text-amber-800 text-sm font-black tracking-tight">AB</span>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-amber-900 tracking-tight">
                  AutoBrief
                </h1>
                <p className="text-sm font-semibold text-amber-700 mt-1">
                  AI-Driven Meetings & Collaboration Platform
                </p>
              </div>
            </div>
          </div>

          {/* Auth Button */}
          <AuthButton />
        </div>
      </div>
    </header>
  )
}

'use client'

import React, { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

const LandingPage = () => {
  const { data: session, status } = useSession();

  const handlePreMeeting = () => {
    window.location.href = "/connectors/pre-meeting";
  };

  const handlePostMeeting = () => {
    window.location.href = "/connectors/post-meeting";
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('google_access_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 relative overflow-hidden font-inter">
      {/* Background Pattern with Amber/Rose Fade */}
      <div className="absolute inset-0 opacity-8 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-rose-200/25"></div>
        <div className="absolute top-[-10%] left-[-15%] w-1/2 h-[380px] bg-gradient-to-br from-amber-300/30 to-rose-200/0 blur-3xl rounded-full opacity-45" />
        <div className="absolute bottom-[-16%] right-[-10%] w-1/3 h-[370px] bg-gradient-to-tl from-rose-300/25 to-amber-100/0 blur-2xl rounded-full opacity-40" />
      </div>

      {/* Header */}
      <header className="relative bg-white/85 backdrop-blur-lg border-b border-amber-200/40 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 via-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-sm transform rotate-3"></div>
                  <div className="relative bg-white/90 rounded-sm px-2 py-1 shadow-inner">
                    <span className="text-amber-800 text-sm font-black tracking-tight font-mono">AB</span>
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

            {/* Auth Section - Sign Out Button */}
            <div>
              {session?.user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {session.user.image && (
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || 'User'}
                        className="w-8 h-8 rounded-full border-2 border-rose-200"
                      />
                    )}
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-amber-900">{session.user.name}</p>
                      <p className="text-xs text-amber-700">{session.user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="text-amber-700 text-sm font-medium">
                  Please sign in to access features
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-8 py-24 z-10">
        <div className="max-w-4xl w-full text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-amber-900 mb-6 leading-tight tracking-tight">
              Streamline Your
              <span className="block text-rose-600">Workflow</span>
            </h2>
            <p className="text-xl text-amber-800 mb-8 max-w-3xl mx-auto leading-relaxed font-medium">
              Centralize your team collaboration with AI-powered meeting summaries, 
              seamless integrations, and intelligent calendar management.
            </p>
          </div>

          {/* Action Buttons - Only show if user is logged in */}
          {session?.user ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-16">
              {/* Pre-Meeting Button */}
              <button
                onClick={handlePreMeeting}
                className="group bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold py-8 px-10 rounded-xl transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-center">
                    <span className="text-xl font-bold block">Pre-Meeting</span>
                    <span className="text-sm opacity-90">Setup & Preparation</span>
                  </div>
                </div>
              </button>

              {/* Post-Meeting Button */}
              <button
                onClick={handlePostMeeting}
                className="group bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold py-8 px-10 rounded-xl transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-center">
                    <span className="text-xl font-bold block">Post-Meeting</span>
                    <span className="text-sm opacity-90">Analysis & Summary</span>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-50/80 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl px-8 py-6 shadow-lg inline-block">
              <p className="text-rose-800 font-semibold">
                Please sign in to access Pre-Meeting and Post-Meeting features
              </p>
            </div>
          )}

          
        </div>
      </main>

      {/* Footer */}
      <footer className="relative py-6 px-8 border-t border-rose-200/40 bg-white/75 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-rose-700 text-sm font-medium">
            © 2025 AutoBrief. Built for enterprise productivity.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
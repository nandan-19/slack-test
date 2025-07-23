'use client'

import React, { useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";

const LandingPage = () => {
  const { data: session, status } = useSession();



  const handleSummariseMeeting = async () => {
    const googleAccessToken = localStorage.getItem("google_access_token");
    if (!googleAccessToken) {
      alert("Connect Calendar first (Google token missing).");
      return;
    }
    try {
      const res = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleAccessToken })
      });
      const data = await res.json();
      if (!data.ok) {
        alert("Failed: " + data.error);
        return;
      }
      window.location.href = `/summary?id=${data.summaryId}`;
    } catch (e) {
      console.error(e);
      alert("Error generating summary");
    }
  };

  const handleConnectSlack = () => {
    window.location.href = "/api/connectors/slack/start";
  };

  const handleConnectJira = async () => {
    try {
      const res = await fetch("/api/connectors/jira/status", { cache: "no-store" });
      const data = await res.json();
      console.log(data);
      if (data.connected) {
        window.location.href = "/jira-dashboard";
      } else {
        window.location.href = "/api/connectors/jira/oauth/start";
      }
    } catch (err) {
      console.error("Jira connect error:", err);
      window.location.href = "/api/connectors/jira/oauth/start";
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('google_access_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCalendar = async () => {
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      window.location.href = '/api/connectors/google/init';
      return;
    }
    try {
      const response = await fetch(`/api/connectors/google/events?access_token=${token}`);
      const data = await response.json();
      if (data.success) {
        console.log('Fetched events:', data.events);
        alert(`Fetched ${data.events.length} upcoming events`);
      } else {
        alert('Failed to fetch events. Try reauthenticating.');
        localStorage.removeItem('google_access_token');
      }
    } catch (error) {
      console.error('Calendar fetch error:', error);
      alert('Calendar fetch error. See console.');
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 flex items-center justify-center">
        <div className="text-amber-700 text-xl">Loading...</div>
      </div>
    );
  }   

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 relative overflow-hidden">
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
              {session?.user && (
                <button
                  onClick={() => (window.location.href = "/connectors")}
                  className="flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors bg-gradient-to-r from-amber-50/80 to-rose-50/60 px-4 py-2 rounded-xl border border-rose-200/50 hover:border-rose-300/60"
                >
                  ← Back
                </button>
              )}
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

            {/* Auth Section */}
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
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => signIn("google")}
                  className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-8 py-24 z-10">
        {session?.user ? (
          <div className="max-w-4xl w-full text-center">
            {/* Hero Section */}
            <div className="mb-16">
              <h2 className="text-5xl md:text-6xl font-bold text-amber-900 mb-6 leading-tight tracking-tight">
                Welcome back,
                <span className="block text-rose-600">{session.user.name?.split(' ')[0]}</span>
              </h2>
              <p className="text-xl text-amber-800 mb-8 max-w-3xl mx-auto leading-relaxed font-medium">
                Centralize your team collaboration with AI-powered meeting summaries, 
                seamless integrations, and intelligent calendar management.
              </p>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
              {/* Summarise Meeting Button - NEW AMBER TO ROSE GRADIENT */}
              <button
                onClick={handleSummariseMeeting}
                className="group bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-medium py-6 px-8 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-lg">Summarise Latest Meeting</span>
                </div>
              </button>

              {/* Calendar Button - Updated to match new scheme */}
              <button
                onClick={handleCalendar}
                className="group bg-white/90 border-2 border-rose-300/70 hover:bg-rose-50/80 hover:border-rose-400 text-rose-800 font-bold py-6 px-8 rounded-xl transform transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-lg">Calendar</span>
                </div>
              </button>

              {/* Connect to Jira Button - Updated to match new scheme */}
              <button
                onClick={handleConnectJira}
                className="group bg-white/90 border-2 border-rose-300/70 hover:bg-rose-50/80 hover:border-rose-400 text-rose-800 font-bold py-6 px-8 rounded-xl transform transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-lg">Connect to Jira</span>
                </div>
              </button>

              {/* Connect to Slack Button - NEW AMBER TO ROSE GRADIENT */}
              <button
                onClick={handleConnectSlack}
                className="group bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-medium py-6 px-8 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-lg">Connect to Slack</span>
                </div>
              </button>
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-r from-amber-50/80 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl px-8 py-5 shadow-lg inline-block">
              <p className="text-rose-800 font-semibold">
                Powered by AI • Secure • Real-time Sync
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl w-full">
            {/* Hero Section */}
            <div className="text-center mb-20">
              <h1 className="text-6xl md:text-7xl font-bold text-amber-900 mb-8 leading-tight tracking-tight">
                Transform Your Meetings Into
                <span className="block text-rose-600">Actionable Insights</span>
              </h1>
              <p className="text-xl text-amber-800 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
                AutoBrief uses advanced AI to automatically transcribe, summarize, and extract action items from your recorded meetings, seamlessly integrating with your existing workflow tools.
              </p>
              
              {/* CTA Button */}
              <div className="mb-16">
                <p className="text-lg text-amber-700 mb-6">
                  Ready to streamline your workflow?
                </p>
                <div className="flex justify-center">
                  <div className="bg-gradient-to-r from-amber-50/80 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl px-6 py-3 shadow-lg">
                    <p className="text-rose-800 font-semibold text-sm">
                      Sign in with Google to get started →
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="mb-20">
              <h2 className="text-4xl font-bold text-amber-900 text-center mb-16">
                How AutoBrief Works
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-amber-200/50">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full mb-6 mx-auto">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h3 className="text-2xl font-bold text-amber-900 mb-4 text-center">Record & Transcribe</h3>
                  <p className="text-amber-800 text-center leading-relaxed">
                    Our advanced Speech-to-Text technology captures and transcribes your meeting recordings with high accuracy, creating a complete written record of your discussions.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-rose-200/50">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full mb-6 mx-auto">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-amber-900 mb-4 text-center">AI-Powered Analysis</h3>
                  <p className="text-amber-800 text-center leading-relaxed">
                    Google's Gemini AI analyzes the transcription to generate intelligent summaries, identify key decisions, and extract future meeting dates and deadlines mentioned during discussions.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-amber-200/50">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full mb-6 mx-auto">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h3 className="text-2xl font-bold text-amber-900 mb-4 text-center">Seamless Integration</h3>
                  <p className="text-amber-800 text-center leading-relaxed">
                    Summaries and action items are automatically synced with your calendar, Slack channels, and Jira projects, ensuring nothing falls through the cracks in your workflow.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Features Section */}
            <div className="mb-20">
              <h2 className="text-4xl font-bold text-amber-900 text-center mb-16">
                Key Features
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* High Accuracy STT */}
                <div className="bg-gradient-to-br from-amber-50/80 to-rose-50/60 backdrop-blur-sm rounded-xl p-6 shadow-md border border-rose-200/40">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-amber-500 to-rose-500 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">High Accuracy STT</h3>
                  <p className="text-amber-800 text-sm">Advanced speech recognition with 98%+ accuracy</p>
                </div>

                {/* AI Summarization */}
                <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/60 backdrop-blur-sm rounded-xl p-6 shadow-md border border-rose-200/40">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">AI Summarization</h3>
                  <p className="text-amber-800 text-sm">Powered by Google Gemini for intelligent insights</p>
                </div>

                {/* Date Extraction */}
                <div className="bg-gradient-to-br from-amber-50/80 to-rose-50/60 backdrop-blur-sm rounded-xl p-6 shadow-md border border-amber-200/40">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-amber-500 to-rose-500 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Date Extraction</h3>
                  <p className="text-amber-800 text-sm">Auto-detect future meetings and deadlines</p>
                </div>

                {/* Seamless Integrations */}
                <div className="bg-gradient-to-br from-rose-50/80 to-amber-50/60 backdrop-blur-sm rounded-xl p-6 shadow-md border border-rose-200/40">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-rose-500 to-amber-500 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Seamless Integrations</h3>
                  <p className="text-amber-800 text-sm">Works with Calendar, Slack, and Jira</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative py-6 px-8 border-t border-rose-200/40 bg-white/75 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-rose-700 text-sm font-medium">
            Enterprise-Ready • AI-Powered • Secure Processing
          </p>
          <p className="text-rose-600 text-xs mt-1">
            Built with cutting-edge AI technology for modern teams • © 2025 AutoBrief
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

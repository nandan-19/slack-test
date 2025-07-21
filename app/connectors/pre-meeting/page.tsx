'use client'

import React, { useEffect } from 'react';

const LandingPage = () => {
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
          <div className="flex items-center space-x-6">
            <button
              onClick={() => (window.location.href = "/connectors")}
              className="flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors bg-gradient-to-r from-amber-50/80 to-rose-50/60 px-4 py-2 rounded-xl border border-rose-200/50 hover:border-rose-300/60"
            >
              ← Back
            </button>
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

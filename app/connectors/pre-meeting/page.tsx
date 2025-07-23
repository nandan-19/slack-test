'use client'

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

const LandingPage = () => {
  const { data: session, status } = useSession();
  const [notification, setNotification] = useState<Notification | null>(null);
  const router = useRouter();
  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    const newNotification: Notification = { id, type, title, message };
    
    setNotification(newNotification);
    // No auto-dismiss - user must click "Got it"
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const handleSummariseMeeting = async () => {
    const googleAccessToken = localStorage.getItem("google_access_token");
    if (!googleAccessToken) {
      showNotification('error', 'Authentication Required', 'Please connect your Google Calendar first to generate meeting summaries.');
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
        showNotification('error', 'Summary Generation Failed', `Unable to generate summary: ${data.error}`);
        return;
      }
      showNotification('success', 'Summary Generated!', 'Your meeting summary has been created successfully.');
      setTimeout(() => {
        window.location.href = `/summary?id=${data.summaryId}`;
      }, 1500);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Network Error', 'Failed to generate summary. Please check your connection and try again.');
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
      showNotification('error', 'Jira Connection Failed', 'Unable to connect to Jira. Please try again or check your permissions.');
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
        showNotification('success', 'Calendar Connected!', `Successfully fetched ${data.events.length} upcoming events from your calendar.`);
      } else {
        showNotification('error', 'Calendar Sync Failed', 'Unable to fetch calendar events. Please reauthenticate your Google account.');
        localStorage.removeItem('google_access_token');
      }
    } catch (error) {
      console.error('Calendar fetch error:', error);
      showNotification('error', 'Connection Error', 'Failed to connect to Google Calendar. Please check your internet connection.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 relative overflow-hidden font-inter">
      {/* Top Middle Popup Notification */}
      {notification && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={closeNotification}
          />
          
          {/* Notification Tile - Small Size */}
          <div className="relative bg-gradient-to-br from-white/96 to-amber-50/90 backdrop-blur-xl border-2 border-amber-200/60 rounded-2xl shadow-2xl max-w-sm w-full p-6 transform animate-in slide-in-from-top-4 duration-300">
            {/* Close Button */}
            <button
              onClick={closeNotification}
              className="absolute top-3 right-3 text-amber-600 hover:text-amber-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon - Small */}
            <div className="flex justify-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                notification.type === 'success' 
                  ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                  : notification.type === 'error'
                  ? 'bg-gradient-to-br from-red-400 to-rose-500'
                  : 'bg-gradient-to-br from-blue-400 to-indigo-500'
              }`}>
                {notification.type === 'success' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Content - Compact */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-amber-900 mb-2">
                {notification.title}
              </h3>
              <p className="text-sm text-amber-800 leading-relaxed mb-5">
                {notification.message}
              </p>
              
              {/* Action Button */}
              <button
                onClick={closeNotification}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 ${
                  notification.type === 'success'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                    : notification.type === 'error'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                }`}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/30 via-transparent to-rose-200/40"></div>
        <div className="absolute top-[-20%] left-[-20%] w-3/5 h-[450px] bg-gradient-to-br from-amber-400/40 to-rose-300/20 blur-3xl rounded-full opacity-60 animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-2/5 h-[400px] bg-gradient-to-tl from-rose-400/35 to-amber-200/15 blur-3xl rounded-full opacity-50 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-[250px] bg-gradient-to-r from-pink-300/20 to-orange-300/20 blur-2xl rounded-full opacity-40" />
      </div>

      {/* Premium Header */}
      <header className="relative bg-white/90 backdrop-blur-xl border-b border-amber-200/50 shadow-lg shadow-amber-100/20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* AutoBrief Branding - Moved to left */}
            <div className="flex items-center space-x-6">
              {/* Enhanced Logo */}
              <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 via-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:rotate-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/25 rounded-md transform rotate-6 shadow-inner"></div>
                  <div className="relative bg-white/95 rounded-md px-2 py-1 shadow-2xl backdrop-blur-sm">
                    <span className="text-amber-800 text-sm font-black tracking-tight font-mono">AB</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-black text-amber-900 tracking-tight bg-gradient-to-r from-amber-900 via-rose-800 to-amber-900 bg-clip-text text-transparent">
                  AutoBrief
                </h1>
                <p className="text-sm font-bold text-amber-700 mt-0.5 tracking-wide">
                  AI-Driven Meetings & Collaboration Platform
                </p>
              </div>
            </div>

            {/* Enhanced Auth Section */}
            <div>
              {session?.user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 bg-gradient-to-r from-amber-50/90 to-rose-50/90 backdrop-blur-sm rounded-xl px-4 py-2 border-2 border-amber-200/60 shadow-lg">
                    {session.user.image && (
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || 'User'}
                        className="w-8 h-8 rounded-full border-2 border-rose-200 shadow-lg"
                      />
                    )}
                    <div className="hidden md:block">
                      <p className="text-xs font-bold text-amber-900">{session.user.name}</p>
                      <p className="text-[10px] font-semibold text-amber-700">{session.user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 text-xs shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="text-amber-700 text-sm font-bold bg-gradient-to-r from-amber-50/90 to-rose-50/90 backdrop-blur-sm rounded-xl px-4 py-2 border-2 border-amber-200/60 shadow-lg">
                  Please sign in to access features
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Back Button - Below navbar, to the left */}
      <div className="relative z-10 px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/connectors')}
            className="flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800 transition-all duration-300 bg-gradient-to-r from-amber-50/90 to-rose-50/90 px-4 py-2 rounded-xl border-2 border-rose-200/60 hover:border-rose-300/80 shadow-lg hover:shadow-xl hover:scale-105 backdrop-blur-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 z-10">
        <div className="max-w-4xl w-full text-center">
          {/* Premium Hero Section */}
          <div className="mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-amber-900 mb-6 leading-tight tracking-tight bg-gradient-to-r from-amber-900 via-rose-800 to-amber-900 bg-clip-text text-transparent drop-shadow-lg">
              Streamline Your
              <span className="block bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">Workflow</span>
            </h2>
            <p className="text-xl text-amber-800 mb-10 max-w-3xl mx-auto leading-relaxed font-semibold drop-shadow-sm">
              Centralize your team collaboration with AI-powered meeting summaries, 
              seamless integrations, and intelligent calendar management.
            </p>
          </div>

          {/* Premium Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
            {/* Enhanced Summarise Meeting Button */}
            <button
              onClick={handleSummariseMeeting}
              className="group relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white font-bold py-6 px-8 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center space-x-3">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-lg font-black">Summarise Latest Meeting</span>
              </div>
            </button>

            {/* Enhanced Calendar Button */}
            <button
              onClick={handleCalendar}
              className="group relative bg-white/95 border-2 border-rose-300/80 hover:bg-gradient-to-br hover:from-rose-50 hover:to-pink-50 hover:border-rose-400 text-rose-800 font-bold py-6 px-8 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 hover:-translate-y-1 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center space-x-3">
                <div className="p-1.5 bg-rose-100/80 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  </div>
                <span className="text-lg font-black">Calendar Integration</span>
              </div>
            </button>

            {/* Enhanced Jira Button */}
            <button
              onClick={handleConnectJira}
              className="group relative bg-white/95 border-2 border-rose-300/80 hover:bg-gradient-to-br hover:from-rose-50 hover:to-pink-50 hover:border-rose-400 text-rose-800 font-bold py-6 px-8 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 hover:-translate-y-1 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center space-x-3">
                <div className="p-1.5 bg-rose-100/80 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-lg font-black">Connect to Jira</span>
              </div>
            </button>

            {/* Enhanced Slack Button */}
            <button
              onClick={handleConnectSlack}
              className="group relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white font-bold py-6 px-8 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center space-x-3">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-lg font-black">Connect to Slack</span>
              </div>
            </button>
          </div>

          {/* Enhanced Info Badge */}
          <div className="bg-gradient-to-r from-amber-50/95 via-rose-50/95 to-pink-50/95 backdrop-blur-xl border-2 border-rose-200/70 rounded-2xl px-8 py-4 shadow-2xl inline-block hover:scale-105 transition-transform duration-300">
            <p className="text-rose-800 font-bold text-base flex items-center justify-center space-x-2">
              <span>Powered by AI</span>
              <span>•</span>
              <span>Secure</span>
              <span>•</span>
              <span>Real-time Sync</span>
            </p>
          </div>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="relative py-6 px-6 border-t-2 border-rose-200/50 bg-white/90 backdrop-blur-xl shadow-2xl z-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-rose-700 text-sm font-bold tracking-wide">
            © 2025 AutoBrief. Built for enterprise productivity excellence.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
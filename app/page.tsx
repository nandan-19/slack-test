"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function fetchStatus() {
    const res = await fetch("/api/connectors/jira/status");
    setStatus(await res.json());
  }

  async function fetchIssues() {
    const res = await fetch("/api/connectors/jira/issues?limit=30");
    const data = await res.json();
    if (data.ok) setIssues(data.issues);
  }

  async function syncNow() {
    setSyncing(true);
    const res = await fetch("/api/connectors/jira/sync", { method: "POST" });
    const data = await res.json();
    console.log("Sync result", data);
    setSyncing(false);
    fetchIssues();
    fetchStatus();
  }

  useEffect(() => {
    fetchStatus();
    fetchIssues();
  }, []);

  const connect = () => {
    window.location.href = "/api/connectors/jira/oauth/start";
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
                AI-Powered Meeting Intelligence Platform
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-8 py-12">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-amber-900 mb-6 leading-tight tracking-tight">
              Transform Your Meetings Into
              <span className="block text-rose-600">Actionable Insights</span>
            </h2>
            <p className="text-xl text-amber-800 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              AutoBrief uses advanced AI to automatically transcribe, summarize, and extract action items from your recorded meetings, 
              seamlessly integrating with your existing workflow tools.
            </p>
            {/* Single Try It Button */}
            <div className="mb-12">
              <button
                onClick={() => window.location.href = "/connectors"}
                className="group bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold py-4 px-12 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-lg"
              >
                Try It
              </button>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mb-20">
            <h3 className="text-3xl font-bold text-center text-amber-900 mb-12">How AutoBrief Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Step 1 */}
              <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-rose-800 text-center mb-4">1. Record & Transcribe</h4>
                <p className="text-amber-900 text-center leading-relaxed">
                  Our advanced Speech-to-Text technology captures and transcribes your meeting recordings with high accuracy, 
                  creating a complete written record of your discussions.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-white/90 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-amber-800 text-center mb-4">2. AI-Powered Analysis</h4>
                <p className="text-rose-900 text-center leading-relaxed">
                  Google's Gemini AI analyzes the transcription to generate intelligent summaries, identify key decisions, 
                  and extract future meeting dates and deadlines mentioned during discussions.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-rose-800 text-center mb-4">3. Seamless Integration</h4>
                <p className="text-amber-900 text-center leading-relaxed">
                  Summaries and action items are automatically synced with your calendar, Slack channels, and Jira projects, 
                  ensuring nothing falls through the cracks in your workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-20">
            <h3 className="text-3xl font-bold text-center text-amber-900 mb-12">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-bold text-amber-900 mb-2">High Accuracy STT</h4>
                <p className="text-sm text-amber-800">Advanced speech recognition with 98%+ accuracy</p>
              </div>

              <div className="bg-gradient-to-br from-white/90 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="font-bold text-rose-900 mb-2">AI Summarization</h4>
                <p className="text-sm text-rose-800">Powered by Google Gemini for intelligent insights</p>
              </div>

              <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-bold text-amber-900 mb-2">Date Extraction</h4>
                <p className="text-sm text-amber-800">Auto-detect future meetings and deadlines</p>
              </div>

              <div className="bg-gradient-to-br from-white/90 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h4 className="font-bold text-rose-900 mb-2">Seamless Integrations</h4>
                <p className="text-sm text-rose-800">Works with Calendar, Slack, and Jira</p>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-6 bg-gradient-to-r from-amber-50/80 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl px-8 py-5 shadow-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-rose-800 font-semibold">
                Enterprise-Ready • AI-Powered • Secure Processing
              </p>
            </div>
            <p className="text-rose-600 text-sm mt-4 font-medium">
              Built with cutting-edge AI technology for modern teams • © 2025 AutoBrief
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

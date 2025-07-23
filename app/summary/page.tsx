"use client";

import { useEffect, useState } from "react";

type SummaryData = {
  ok: boolean;
  error?: string;
  summary: {
    meetingTitle: string;
    meetingStart?: string;
    sections: Record<string, string>;
    sources: {
      jiraIssueKeys: string[];
      slackChannels: string[];
    };
  };
};

export default function SummaryPage({ searchParams }: any) {
  const { id } = searchParams;
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/summary/get?id=${id}`)
        .then(r => r.json())
        .then(setData);
    }
  }, [id]);

  if (!id) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 flex items-center justify-center font-inter">
      <p className="text-center p-8 text-red-600 font-semibold text-xl">No summary id.</p>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 flex items-center justify-center font-inter">
      <p className="text-center p-8 text-gray-700 font-semibold text-xl">Loading…</p>
    </div>
  );

  if (!data.ok) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 flex items-center justify-center font-inter">
      <p className="text-center p-8 text-red-600 font-semibold text-xl">Error: {data.error}</p>
    </div>
  );

  const s = data.summary.sections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 relative overflow-hidden font-inter">
      {/* Background Pattern with Amber/Rose Fade */}
      <div className="absolute inset-0 opacity-8 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-rose-200/25"></div>
        <div className="absolute top-[-10%] left-[-15%] w-1/2 h-[380px] bg-gradient-to-br from-amber-300/30 to-rose-200/0 blur-3xl rounded-full opacity-45" />
        <div className="absolute bottom-[-16%] right-[-10%] w-1/3 h-[370px] bg-gradient-to-tl from-rose-300/25 to-amber-100/0 blur-2xl rounded-full opacity-40" />
      </div>

      {/* Enhanced Header */}
      <header className="relative bg-white/90 backdrop-blur-xl border-b border-amber-200/50 shadow-lg shadow-amber-100/20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
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
                Meeting Summary Report
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Back Button - Below navbar, to the left */}
      <div className="relative z-10 px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => window.location.href = "/connectors/pre-meeting"}
            className="flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800 transition-all duration-300 bg-gradient-to-r from-amber-50/90 to-rose-50/90 px-4 py-2 rounded-xl border-2 border-rose-200/60 hover:border-rose-300/80 shadow-lg hover:shadow-xl hover:scale-105 backdrop-blur-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div className="relative z-10 p-8 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          {/* Meeting Title Section */}
          <div className="mb-12 text-center">
            <div className="bg-gradient-to-r from-white/90 to-rose-50/80 backdrop-blur-sm border border-rose-200/60 rounded-2xl p-8 shadow-lg">
              <h2 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4 leading-tight tracking-tight font-inter">
                {data.summary.meetingTitle}
              </h2>
              {data.summary.meetingStart && (
                <time className="text-lg text-rose-700 font-semibold bg-gradient-to-r from-amber-50/80 to-rose-50/60 px-4 py-2 rounded-full border border-rose-200/50 shadow-sm font-inter">
                  {new Date(data.summary.meetingStart).toLocaleString()}
                </time>
              )}
            </div>
          </div>

          {/* Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {Object.entries(s).map(([sectionTitle, sectionContent]) => (
              <div key={sectionTitle} className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="border-b border-rose-200/50 px-8 py-6 bg-gradient-to-r from-rose-50/80 to-amber-50/60">
                  <h3 className="text-2xl font-bold text-rose-800 tracking-tight font-inter">
                    {sectionTitle}
                  </h3>
                </div>
                <div className="p-8">
                  <p className="text-amber-900 leading-relaxed text-base font-medium whitespace-pre-wrap font-inter">
                    {sectionContent || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Sources Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Jira Issues */}
            <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="border-b border-rose-200/50 px-8 py-6 bg-gradient-to-r from-rose-50/80 to-amber-50/60">
                <h3 className="text-2xl font-bold text-rose-800 flex items-center font-inter">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-rose-500 rounded-lg mr-4 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  Jira Issues
                </h3>
              </div>
              <div className="p-8">
                <p className="text-amber-900 text-base font-medium leading-relaxed font-inter">
                  {data.summary.sources.jiraIssueKeys.join(", ") || "None"}
                </p>
              </div>
            </div>

            {/* Slack Channels */}
            <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="border-b border-rose-200/50 px-8 py-6 bg-gradient-to-r from-rose-50/80 to-amber-50/60">
                <h3 className="text-2xl font-bold text-rose-800 flex items-center font-inter">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-rose-500 rounded-lg mr-4 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  Slack Channels
                </h3>
              </div>
              <div className="p-8">
                <p className="text-amber-900 text-base font-medium leading-relaxed font-inter">
                  {data.summary.sources.slackChannels.join(", ") || "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center space-x-6 bg-gradient-to-r from-amber-50/80 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl px-8 py-5 shadow-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-rose-800 font-semibold font-inter">
                AI-Generated Summary • Secure Processing • Real-time Analysis
              </p>
            </div>
            <p className="text-rose-600 text-sm mt-4 font-medium font-inter">
              Generated by AutoBrief on {new Date().toLocaleDateString()} • Classification: Internal Use Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
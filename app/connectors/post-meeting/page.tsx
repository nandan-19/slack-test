'use client';

import React, { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';

interface TranscriptResult {
  id: string;
  status: string;
  text?: string;
  confidence?: number;
  summary?: string;
  chapters?: Array<{
    headline: string;
    summary: string;
    start: number;
    end: number;
  }>;
  speakers?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
  highlights?: {
    results: Array<{
      text: string;
      count: number;
      rank: number;
    }>;
  };
}

interface ActionableItem {
  id: string;
  type: 'jira_create' | 'jira_update' | 'calendar_create' | 'calendar_delete';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metadata: any;
  confidence: number;
  selected?: boolean;
}

interface ProcessedResult {
  summary: string;
  actionableItems: ActionableItem[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function AudioTranscriber() {
  const { data: session, status } = useSession();
  const [transcriptResult, setTranscriptResult] = useState<TranscriptResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // New LLM processing states
  const [processedResult, setProcessedResult] = useState<ProcessedResult | null>(null);
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Popup notification state
  const [notification, setNotification] = useState<Notification | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    const newNotification: Notification = { id, type, title, message };
    
    setNotification(newNotification);
    // No auto-dismiss - user must click "Got it"
  };

  const closeNotification = () => {
    setNotification(null);
  };

  // Handle video/audio file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset all states
    setIsProcessing(true);
    setError(null);
    setTranscriptResult(null);
    setProcessedResult(null);
    setSelectedActions(new Set());
    setExecutionResults([]);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      // Upload file to API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      // If transcription is still processing, poll for results
      if (result.status === 'queued' || result.status === 'processing') {
        await pollForResults(result.id);
      } else {
        setTranscriptResult(result);
        setIsProcessing(false);
        
        // Process with LLM after transcription completes
        if (result.text) {
          await processWithLLM(result.text);
        }
      }

    } catch (err) {
      setError(null);
      showNotification('error', 'Upload Failed',`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  // Poll AssemblyAI for transcription completion
  const pollForResults = async (transcriptId: string) => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/transcribe?id=${transcriptId}`);
        const result = await response.json();

        if (result.status === 'completed') {
          setTranscriptResult(result);
          setIsProcessing(false);
          
          // ✅ Process with LLM after transcription completes
          if (result.text) {
            await processWithLLM(result.text);
          }
        } else if (result.status === 'error') {
          setError(null);
          showNotification('error', 'Transcription Failed', 'The transcription process failed. Please try uploading your file again.');
          setIsProcessing(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setError(null);
          showNotification('error', 'Transcription Timeout', 'Transcription is taking longer than expected. Please try again with a smaller file.');
          setIsProcessing(false);
        }
      } catch (err) {
        setError(null);
        showNotification('error', 'Connection Error', 'Failed to fetch transcription results. Please check your connection and try again.');
        setIsProcessing(false);
      }
    };

    poll();
  };

  // Process transcript with Gemini LLM
  const processWithLLM = async (transcript: string) => {
    setIsProcessingLLM(true);
    
    try {
      const response = await fetch('/api/process-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });

      if (!response.ok) throw new Error('LLM processing failed');
      
      const result = await response.json();
      setProcessedResult(result);
      showNotification('success', 'Analysis Complete!', 'Your meeting has been analyzed and actionable items have been extracted.');
    } catch (error) {
      console.error('LLM processing error:', error);
      showNotification('error', 'AI Analysis Failed', 'Failed to process transcript with AI. The transcription is still available below.');
    } finally {
      setIsProcessingLLM(false);
    }
  };

  // Handle action selection
  const toggleActionSelection = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  // Execute selected actions
  const executeSelectedActions = async () => {
    if (!processedResult || selectedActions.size === 0) return;

    setIsExecuting(true);
    const actionsToExecute = processedResult.actionableItems.filter(item => 
      selectedActions.has(item.id)
    );
    

    try {
      const accessToken = localStorage.getItem('google_access_token')
      const response = await fetch('/api/execute-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: actionsToExecute, accessToken: accessToken })
      });

      const result = await response.json();
      setExecutionResults(result.results);
      
      // Show success message
      const successCount = result.results.filter((r: any) => r.success).length;
      showNotification('success', 'Actions Executed!', `Successfully executed ${successCount} out of ${actionsToExecute.length} actions.`);
    } catch (error) {
      console.error('Action execution failed:', error);
      showNotification('error', 'Execution Failed', 'Failed to execute selected actions. Please try again or execute them manually.');
    } finally {
      setIsExecuting(false);
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

      {/* Background Pattern with Amber/Rose Fade */}
      <div className="absolute inset-0 opacity-8 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-rose-200/25"></div>
        <div className="absolute top-[-10%] left-[-15%] w-1/2 h-[380px] bg-gradient-to-br from-amber-300/30 to-rose-200/0 blur-3xl rounded-full opacity-45" />
        <div className="absolute bottom-[-16%] right-[-10%] w-1/3 h-[370px] bg-gradient-to-tl from-rose-300/25 to-amber-100/0 blur-2xl rounded-full opacity-40" />
      </div>

      {/* Enhanced Header */}
      <header className="relative bg-white/90 backdrop-blur-xl border-b border-amber-200/50 shadow-lg shadow-amber-100/20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* AutoBrief Branding - Left side */}
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
                  Post-Meeting Analysis
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
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800 transition-all duration-300 bg-gradient-to-r from-amber-50/90 to-rose-50/90 px-4 py-2 rounded-xl border-2 border-rose-200/60 hover:border-rose-300/80 shadow-lg hover:shadow-xl hover:scale-105 backdrop-blur-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="relative w-16 h-16 bg-gradient-to-br from-amber-500 via-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-sm transform rotate-3"></div>
                <div className="relative bg-white/90 rounded-sm px-2 py-1 shadow-inner">
                  <span className="text-amber-800 text-lg font-black tracking-tight font-mono">AB</span>
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-amber-900 tracking-tight">
                AI-Powered Meeting Analysis
              </h1>
              <p className="text-amber-700 font-semibold">
                Upload, Transcribe & Extract Actionable Insights
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-white/90 to-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-8 shadow-lg inline-block">
            <label className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold rounded-xl cursor-pointer transition-all duration-200 text-lg shadow-lg hover:shadow-xl hover:scale-105">
              📁 Upload Meeting Video
              <input
                ref={fileInputRef}
                type="file"
                accept="video/,audio/"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing || isProcessingLLM}
              />
            </label>
            <p className="mt-4 text-amber-800 font-medium">
              Supports most video and audio formats • Advanced AI Processing
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-8 bg-gradient-to-r from-white/90 to-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-6 shadow-lg">
            <div className="bg-amber-100/80 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-4 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-center mt-3 text-amber-900 font-semibold">Uploading... {uploadProgress}%</p>
          </div>
        )}
        {/* Processing Status */}
        {isProcessing && (
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-white/90 to-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-12 shadow-lg inline-block">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-500 mb-6"></div>
              <p className="text-xl text-amber-900 font-semibold">
                🤖 AI is transcribing your meeting...
              </p>
              <p className="text-amber-700 mt-2">This usually takes 1-3 minutes</p>
            </div>
          </div>
        )}

        {/* LLM Processing Status */}
        {isProcessingLLM && (
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-white/90 to-rose-50/80 backdrop-blur-sm border border-rose-200/60 rounded-2xl p-12 shadow-lg inline-block">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-rose-200 border-t-rose-500 mb-6"></div>
              <p className="text-xl text-rose-900 font-semibold">
                🧠 Gemini AI is analyzing transcript...
              </p>
              <p className="text-rose-700 mt-2">Extracting actionable items and insights</p>
            </div>
          </div>
        )}

        {/* AI-Processed Results */}
        {processedResult && (
          <div className="space-y-8 mb-12">
            {/* Enhanced Summary */}
            <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="border-b border-rose-200/50 px-8 py-6 bg-gradient-to-r from-rose-50/80 to-amber-50/60">
                <h2 className="text-2xl font-bold text-rose-800 flex items-center">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-rose-500 rounded-lg mr-4 shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  Gemini AI Summary
                </h2>
              </div>
              <div className="p-8">
                <div className="prose prose-amber max-w-none">
                  <ReactMarkdown 
                    components={{
                      p: ({children}) => <p className="mb-4 text-amber-900">{children}</p>,
                      h1: ({children}) => <h1 className="text-2xl font-bold text-rose-800 mb-4">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-bold text-rose-700 mb-3">{children}</h2>,
                      h3: ({children}) => <h3 className="text-lg font-semibold text-amber-800 mb-2">{children}</h3>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-4 text-amber-900 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-4 text-amber-900 space-y-1">{children}</ol>,
                      strong: ({children}) => <strong className="font-bold text-rose-800">{children}</strong>,
                      em: ({children}) => <em className="italic text-amber-800">{children}</em>,
                    }}
                  >
                    {processedResult.summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Actionable Items */}
            {processedResult.actionableItems.length > 0 && (
              <div className="bg-gradient-to-br from-white/90 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="border-b border-amber-200/50 px-8 py-6 bg-gradient-to-r from-amber-50/80 to-rose-50/60">
                  <h2 className="text-2xl font-bold text-amber-800 flex items-center">
                    <div className="p-2 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg mr-4 shadow-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    AI-Detected Actions
                  </h2>
                  <p className="text-rose-700 mt-2 font-medium">
                    Select the actions you want to execute automatically:
                  </p>
                </div>
                
                <div className="p-8 space-y-6">
                  {processedResult.actionableItems.map((item) => (
                    <div key={item.id} className="bg-gradient-to-r from-white/90 to-amber-50/60 p-6 rounded-xl border border-amber-200/50 hover:border-rose-300/60 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          id={item.id}
                          checked={selectedActions.has(item.id)}
                          onChange={() => toggleActionSelection(item.id)}
                          className="w-5 h-5 text-rose-600 bg-white border-2 border-amber-300 rounded focus:ring-rose-500 focus:ring-2 mt-1 transition-colors"
                          disabled={isExecuting}
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className={`px-3 py-2 rounded-lg text-sm font-bold border shadow-sm ${
                              item.type === 'jira_create' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              item.type === 'jira_update' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                              item.type === 'calendar_create' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                              'bg-red-50 text-red-800 border-red-200'
                            }`}>
                              {item.type === 'jira_create' ? '📝 CREATE JIRA' :
                               item.type === 'jira_update' ? '✏ UPDATE JIRA' :
                               item.type === 'calendar_create' ? '📅 CREATE MEETING' :
                               '🗑 DELETE EVENT'}
                            </span>
                            <span className={`px-3 py-2 rounded-lg text-sm font-bold border shadow-sm ${
                              item.priority === 'high' ? 'bg-red-50 text-red-800 border-red-200' :
                              item.priority === 'medium' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                              'bg-gray-50 text-gray-800 border-gray-200'
                            }`}>
                             {(item.priority || 'medium').toUpperCase()}

                            </span>
                            <span className="text-sm text-amber-700 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-200/50 font-semibold">
                              {Math.round(item.confidence * 100)}% confidence
                            </span>
                          </div>
                          <h4 className="font-bold text-rose-900 mb-2 text-lg">{item.title}</h4>
                          <div className="prose prose-amber max-w-none">
                            <ReactMarkdown 
                              components={{
                                p: ({children}) => <p className="mb-2 text-amber-900">{children}</p>,
                                strong: ({children}) => <strong className="font-bold text-rose-800">{children}</strong>,
                                em: ({children}) => <em className="italic text-amber-800">{children}</em>,
                              }}
                            >
                              {item.description}
                            </ReactMarkdown>
                          </div>
                          
                          {/* Show metadata */}
                          {Object.keys(item.metadata).length > 0 && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50/80 to-rose-50/60 rounded-lg border border-amber-200/40">
                              <strong className="text-amber-800 text-sm font-bold">Details:</strong>
                              <pre className="mt-2 whitespace-pre-wrap text-xs text-amber-800 font-mono bg-white/60 p-3 rounded border border-amber-200/40 overflow-x-auto">
                                {JSON.stringify(item.metadata, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Show execution results */}
                          {executionResults.find(r => r.actionId === item.id) && (
                            <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${
                              executionResults.find(r => r.actionId === item.id)?.success 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              {executionResults.find(r => r.actionId === item.id)?.success 
                                ? '✅ Successfully executed' 
                                : '❌ Failed to execute'}
                              {executionResults.find(r => r.actionId === item.id)?.error && (
                                <span className="block mt-2 text-xs font-normal text-red-700">
                                  Error: {executionResults.find(r => r.actionId === item.id)?.error}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Execute Actions Button */}
                  {selectedActions.size > 0 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={executeSelectedActions}
                        disabled={isExecuting}
                        className={`px-10 py-4 font-bold rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl ${
                          isExecuting 
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white hover:scale-105'
                        }`}
                      >
                        {isExecuting ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                            Executing...
                          </>
                        ) : (
                          <>
                            🚀 Execute {selectedActions.size} Selected Action{selectedActions.size !== 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Original Transcript Results */}
        {transcriptResult && transcriptResult.text && (
          <div className="space-y-8">
            {/* Key Highlights */}
            {transcriptResult.highlights?.results && (
              <div className="bg-gradient-to-br from-white/90 to-rose-50/60 backdrop-blur-sm border border-rose-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="border-b border-amber-200/50 px-8 py-6 bg-gradient-to-r from-amber-50/80 to-rose-50/60">
                  <h2 className="text-2xl font-bold text-amber-800 flex items-center">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg mr-4 shadow-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    Key Topics Discussed
                  </h2>
                </div>
                <div className="p-8">
                  <div className="flex flex-wrap gap-4">
                    {transcriptResult.highlights.results.slice(0, 10).map((highlight, index) => (
                      <span 
                        key={index}
                        className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold border border-emerald-200/50 shadow-sm"
                      >
                        {highlight.text} ({highlight.count}x)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chapters */}
            {transcriptResult.chapters && transcriptResult.chapters.length > 0 && (
              <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="border-b border-rose-200/50 px-8 py-6 bg-gradient-to-r from-rose-50/80 to-amber-50/60">
                  <h2 className="text-2xl font-bold text-rose-800 flex items-center">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mr-4 shadow-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Meeting Sections
                  </h2>
                </div>
                <div className="p-8 space-y-6">
                  {transcriptResult.chapters.map((chapter, index) => (
                    <div key={index} className="bg-gradient-to-r from-white/90 to-rose-50/60 p-6 rounded-xl border border-rose-200/50 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-rose-800">
                          {chapter.headline}
                        </h3>
                        <span className="text-sm text-amber-700 bg-amber-50/80 px-3 py-1 rounded-full font-semibold border border-amber-200/50">
                          {Math.round(chapter.start / 1000)}s - {Math.round(chapter.end / 1000)}s
                        </span>
                      </div>
                      <div className="prose prose-amber max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({children}) => <p className="mb-2 text-amber-900">{children}</p>,
                            strong: ({children}) => <strong className="font-bold text-rose-800">{children}</strong>,
                            em: ({children}) => <em className="italic text-amber-800">{children}</em>,
                          }}
                        >
                          {chapter.summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Transcript with Speakers */}
            <div className="bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm border border-amber-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="border-b border-rose-200/50 px-8 py-6 bg-gradient-to-r from-rose-50/80 to-amber-50/60">
                <h2 className="text-2xl font-bold text-rose-800 flex items-center">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg mr-4 shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2m2-4h4l-2-2m0 0l-2-2m2 2v4" />
                    </svg>
                  </div>
                  Full Transcript
                </h2>
              </div>
              
              <div className="p-8">
                {transcriptResult.speakers && transcriptResult.speakers.length > 0 ? (
                  <div className="space-y-6">
                    {transcriptResult.speakers.map((utterance, index) => (
                      <div key={index} className="bg-gradient-to-r from-white/90 to-amber-50/60 p-6 rounded-xl border border-amber-200/50 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-rose-700 text-lg bg-rose-50/80 px-3 py-1 rounded-lg border border-rose-200/50">
                            {utterance.speaker}
                          </span>
                          <span className="text-sm text-amber-700 bg-amber-50/80 px-3 py-1 rounded-lg font-semibold border border-amber-200/50">
                            {Math.round(utterance.start / 1000)}s
                          </span>
                        </div>
                        <div className="prose prose-amber max-w-none">
                          <ReactMarkdown 
                            components={{
                              p: ({children}) => <p className="mb-2 text-amber-900">{children}</p>,
                              strong: ({children}) => <strong className="font-bold text-rose-800">{children}</strong>,
                              em: ({children}) => <em className="italic text-amber-800">{children}</em>,
                            }}
                          >
                            {utterance.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-white/90 to-amber-50/60 p-8 rounded-xl border border-amber-200/50 shadow-sm">
                    <div className="prose prose-amber max-w-none">
                      <ReactMarkdown 
                        components={{
                          p: ({children}) => <p className="mb-4 text-amber-900">{children}</p>,
                          strong: ({children}) => <strong className="font-bold text-rose-800">{children}</strong>,
                          em: ({children}) => <em className="italic text-amber-800">{children}</em>,
                        }}
                      >
                        {transcriptResult.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 text-center">
                  <span className="text-sm text-amber-700 bg-amber-50/80 px-4 py-2 rounded-full font-semibold border border-amber-200/50 shadow-sm">
                    Confidence: {transcriptResult.confidence ? Math.round(transcriptResult.confidence * 100) : 'N/A'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
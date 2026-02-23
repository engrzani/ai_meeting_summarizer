"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Download,
  Share2,
  Loader2,
  FileText,
  Brain,
  Clock,
  Copy,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Recording {
  id: string;
  title: string;
  transcript: string | null;
  summary: string | null;
  audioUrl: string | null;
  status: string;
  shareToken: string | null;
  duration: number | null;
  createdAt: string;
}

export default function RecordingDetailPage() {
  const { id } = useParams();
  const { data: session, status: authStatus } = useSession();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "simple">("simple");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (authStatus === "authenticated" && id) {
      fetchRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, id]);

  // Poll if still processing with faster initial checks
  useEffect(() => {
    if (!recording || recording.status === "completed" || recording.status === "error") return;

    let pollCount = 0;
    let pollInterval = 1000; // Start with 1 second
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      await fetchRecording();
      pollCount++;

      // Exponential backoff
      if (pollCount > 5) pollInterval = 2000;
      if (pollCount > 10) pollInterval = 3000;

      // Continue polling if not completed/error and under 60 attempts
      if (pollCount < 60) {
        timeoutId = setTimeout(poll, pollInterval);
      }
    };

    timeoutId = setTimeout(poll, pollInterval);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.status]);

  const fetchRecording = async () => {
    try {
      const response = await fetch(`/api/recordings/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRecording(data.recording);
      }
    } catch (error) {
      console.error("Failed to fetch recording:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!recording?.shareToken) return;
    const url = `${window.location.origin}/share/${recording.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-gray-500">Recording not found</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isProcessing = !["completed", "error"].includes(recording.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Bar */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {recording.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(new Date(recording.createdAt))}
            </span>
            {recording.duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(recording.duration / 60)}m {recording.duration % 60}s
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                recording.status === "completed"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : recording.status === "error"
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}
            >
              {recording.status === "completed" && <Check className="w-3 h-3" />}
              {recording.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recording.status === "completed" && (
            <>
              <a
                href={`/api/recordings/${recording.id}/pdf`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm shadow-indigo-200"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </a>
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {recording.audioUrl && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 mb-8 shadow-lg">
          <audio controls className="w-full [&::-webkit-media-controls-panel]:bg-transparent" src={recording.audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {recording.status === "transcribing"
              ? "Transcribing your audio..."
              : recording.status === "summarizing"
                ? "Generating AI summary..."
                : "Processing..."}
          </p>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Our AI is analyzing your recording. This page will update automatically when ready.
          </p>
          <div className="flex justify-center gap-1.5 mt-6">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}

      {/* Results */}
      {recording.status === "completed" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => setActiveTab("simple")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "simple"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <Brain className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "summary"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Summary
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "transcript"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              Full Transcript
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "simple" && (
              <div className="animate-in fade-in duration-500">
                {recording.summary ? (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100 shadow-sm">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Summary</h3>
                        <div className="text-gray-700 leading-relaxed text-base">
                          {(() => {
                            const overviewMatch = recording.summary.match(/##\s*Overview\s*[\r\n]+([\s\S]*?)(?=\n##|$)/);
                            if (overviewMatch && overviewMatch[1]) {
                              return overviewMatch[1].trim();
                            }
                            // Fallback: show first paragraph or first 300 chars
                            const firstPara = recording.summary.split('\n\n')[0];
                            return firstPara.length > 300 ? firstPara.substring(0, 300) + '...' : firstPara;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No summary available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <div>
                {recording.summary ? (
                  <div className="summary-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <div className="mt-8 mb-4 first:mt-0">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <span className="w-1 h-6 bg-indigo-500 rounded-full inline-block" />
                              {children}
                            </h2>
                          </div>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-gray-700 leading-7 mb-3">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-2 mb-4 ml-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="space-y-2 mb-4 ml-1 list-decimal list-inside">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => {
                          const text = String(children);
                          const isChecked = text.startsWith("☑") || text.startsWith("✅");
                          const isUnchecked = text.startsWith("☐") || text.startsWith("⬜");
                          return (
                            <li className="flex items-start gap-3 text-gray-700 leading-7">
                              <span className="mt-2 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                              <span>{children}</span>
                            </li>
                          );
                        },
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),
                        hr: () => (
                          <hr className="my-6 border-gray-100" />
                        ),
                        em: ({ children }) => (
                          <em className="text-gray-500 text-sm not-italic">
                            {children}
                          </em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-3 border-indigo-200 bg-indigo-50/50 rounded-r-lg pl-4 pr-4 py-3 my-4 text-gray-700">
                            {children}
                          </blockquote>
                        ),
                        input: ({ checked, ...props }) => (
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 mr-2 mt-0.5"
                          />
                        ),
                      }}
                    >
                      {recording.summary}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No summary available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (recording.transcript) {
                      navigator.clipboard.writeText(recording.transcript);
                    }
                  }}
                  className="absolute top-0 right-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy transcript"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                {recording.transcript ? (
                  <div className="whitespace-pre-wrap text-gray-700 leading-8 pr-20 font-mono text-sm bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                    {recording.transcript}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No transcript available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {recording.status === "error" && (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <p className="text-red-600 font-medium">
            An error occurred while processing this recording.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please try recording again or contact support.
          </p>
        </div>
      )}
    </div>
  );
}

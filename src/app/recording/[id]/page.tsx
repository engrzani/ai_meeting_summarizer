"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("summary");
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

  // Poll if still processing
  useEffect(() => {
    if (!recording || recording.status === "completed" || recording.status === "error") return;

    const interval = setInterval(async () => {
      await fetchRecording();
    }, 3000);

    return () => clearInterval(interval);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {recording.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(new Date(recording.createdAt))}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                recording.status === "completed"
                  ? "bg-green-50 text-green-600"
                  : recording.status === "error"
                    ? "bg-red-50 text-red-600"
                    : "bg-amber-50 text-amber-600"
              }`}
            >
              {recording.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recording.status === "completed" && (
            <>
              <a
                href={`/api/recordings/${recording.id}/pdf`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </a>
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <audio controls className="w-full" src={recording.audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">
            {recording.status === "transcribing"
              ? "Transcribing your audio..."
              : recording.status === "summarizing"
                ? "Generating AI summary..."
                : "Processing..."}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            This may take a minute. The page will update automatically.
          </p>
        </div>
      )}

      {/* Results */}
      {recording.status === "completed" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "summary"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Brain className="w-4 h-4" />
              AI Summary
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "transcript"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              Full Transcript
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "summary" && (
              <div className="prose prose-sm max-w-none">
                {recording.summary ? (
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {recording.summary}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No summary available</p>
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
                  className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Copy transcript"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {recording.transcript ? (
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed pr-10">
                    {recording.transcript}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">
                    No transcript available
                  </p>
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

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, FileText, Clock, User, Mic, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SharedRecording {
  id: string;
  title: string;
  transcript: string | null;
  summary: string | null;
  status: string;
  createdAt: string;
  author: string;
}

export default function SharedRecordingPage() {
  const { token } = useParams();
  const [recording, setRecording] = useState<SharedRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");

  useEffect(() => {
    if (token) {
      fetchRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchRecording = async () => {
    try {
      const response = await fetch(`/api/share/${token}`);
      if (response.ok) {
        const data = await response.json();
        setRecording(data.recording);
      } else {
        setError("Recording not found or link has expired");
      }
    } catch {
      setError("Failed to load recording");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Not Found</h1>
        <p className="text-gray-500">{error || "This recording doesn't exist"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Shared Badge */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-600">
          <Mic className="w-4 h-4" />
          Shared via VoiceScribe
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{recording.title}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mt-2">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {recording.author}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(new Date(recording.createdAt))}
          </span>
        </div>
      </div>

      {/* Content */}
      {recording.status === "completed" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
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

          <div className="p-8">
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
                          <p className="text-gray-700 leading-7 mb-3">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-2 mb-4 ml-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="space-y-2 mb-4 ml-1 list-decimal list-inside">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="flex items-start gap-3 text-gray-700 leading-7">
                            <span className="mt-2 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                            <span>{children}</span>
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">{children}</strong>
                        ),
                        hr: () => <hr className="my-6 border-gray-100" />,
                        em: ({ children }) => (
                          <em className="text-gray-500 text-sm not-italic">{children}</em>
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
                  <p className="text-gray-400 text-center py-8">No summary available</p>
                )}
              </div>
            )}
            {activeTab === "transcript" && (
              <div>
                {recording.transcript ? (
                  <div className="whitespace-pre-wrap text-gray-700 leading-8 font-mono text-sm bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                    {recording.transcript}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No transcript available</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">
            This recording is still being processed
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Please check back in a few minutes
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-gray-400">
        <p>
          Powered by{" "}
          <a href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            VoiceScribe
          </a>
        </p>
      </div>
    </div>
  );
}

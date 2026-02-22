"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, FileText, Brain, Clock, User, Mic } from "lucide-react";
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

          <div className="p-6">
            {activeTab === "summary" && (
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {recording.summary || "No summary available"}
              </div>
            )}
            {activeTab === "transcript" && (
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {recording.transcript || "No transcript available"}
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

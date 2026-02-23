"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AudioRecorder from "@/components/AudioRecorder";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

export default function RecordPage() {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("en");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    // Validate minimum duration (at least 3 seconds)
    if (duration < 3) {
      setError("Recording too short. Please record at least 3 seconds of audio for accurate transcription.");
      setUploadStatus("error");
      return;
    }

    // Validate blob size (at least 1KB)
    if (blob.size < 1024) {
      setError("Recording file is too small. Please ensure your microphone is working and try again.");
      setUploadStatus("error");
      return;
    }

    setUploadStatus("uploading");
    setError("");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("title", title || `Recording ${new Date().toLocaleDateString()}`);
      formData.append("language", language);

      const response = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setRecordingId(data.recording.id);
      setUploadStatus("processing");

      // Poll for status
      pollStatus(data.recording.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload recording");
      setUploadStatus("error");
    }
  };

  const pollStatus = async (id: string) => {
    let pollCount = 0;
    let pollInterval = 1000; // Start with 1 second
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/recordings/${id}/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "completed") {
            setUploadStatus("done");
            return true; // Stop polling
          } else if (data.status === "error") {
            setUploadStatus("error");
            setError("Processing failed. Please try again.");
            return true; // Stop polling
          }
        }
      } catch {
        // Continue polling
      }
      return false; // Continue polling
    };

    // Exponential backoff: faster initially, slower later
    const poll = async () => {
      pollCount++;
      const shouldStop = await checkStatus();
      
      if (shouldStop || pollCount > 60) { // Max 60 attempts
        return;
      }
      
      // Increase interval gradually: 1s → 2s → 3s (max)
      if (pollCount > 5) pollInterval = 2000;
      if (pollCount > 10) pollInterval = 3000;
      
      setTimeout(poll, pollInterval);
    };
    
    // Start polling immediately
    poll();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Recording</h1>
        <p className="text-gray-500 mt-1">
          Record a room or virtual meeting — AI will transcribe and summarize it
        </p>
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 max-w-md mx-auto">
          <p className="font-semibold mb-1">📝 Tips for best results:</p>
          <ul className="text-xs space-y-0.5 text-left">
            <li>• Speak clearly and at normal volume</li>
            <li>• Record at least 10-15 seconds of content</li>
            <li>• Minimize background noise</li>
            <li>• For virtual meetings: check "Share tab audio"</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        {/* Title Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Recording Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="e.g., Team Meeting Notes"
            disabled={uploadStatus !== "idle"}
          />
        </div>

        {/* Language Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Summary Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
            disabled={uploadStatus !== "idle"}
          >
            <option value="auto">Same as Audio (Auto-detect)</option>
            <option value="en">English</option>
            <option value="ur">اردو (Urdu)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="ar">العربية (Arabic)</option>
            <option value="es">Español (Spanish)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
            <option value="zh">中文 (Chinese)</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="ko">한국어 (Korean)</option>
            <option value="pt">Português (Portuguese)</option>
            <option value="ru">Русский (Russian)</option>
            <option value="it">Italiano (Italian)</option>
            <option value="tr">Türkçe (Turkish)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1.5">
            Transcript will be in original language. Summary will be in selected language.
          </p>
        </div>

        {/* Recorder */}
        {uploadStatus === "idle" && (
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        )}

        {/* Upload/Processing Status */}
        {uploadStatus === "uploading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Uploading recording...</p>
              <p className="text-sm text-gray-500 mt-1">
                Please wait while we upload your audio
              </p>
            </div>
          </div>
        )}

        {uploadStatus === "processing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">
                AI is processing your recording...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This usually takes 5-15 seconds
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {uploadStatus === "done" && recordingId && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-lg">
                Processing Complete!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Your recording has been transcribed and summarized
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => router.push(`/recording/${recordingId}`)}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
              >
                View Results
              </button>
              <button
                onClick={() => {
                  setUploadStatus("idle");
                  setTitle("");
                  setLanguage("en");
                  setRecordingId(null);
                }}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Record Another
              </button>
            </div>
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-lg">
                Something went wrong
              </p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
            <button
              onClick={() => {
                setUploadStatus("idle");
                setError("");
              }}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors mt-4"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

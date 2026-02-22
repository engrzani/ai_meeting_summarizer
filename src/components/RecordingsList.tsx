"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  FileText,
  Share2,
  Trash2,
  Download,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Recording {
  id: string;
  title: string;
  status: string;
  duration: number | null;
  createdAt: string;
  shareToken: string | null;
}

export default function RecordingsList() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const response = await fetch("/api/recordings/list");
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings);
      }
    } catch (error) {
      console.error("Failed to fetch recordings:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecording = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/recordings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRecordings((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete recording:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const copyShareLink = (shareToken: string) => {
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
      case "transcribing":
      case "summarizing":
        return <Loader2 className="w-4 h-4 animate-spin text-amber-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "processing":
        return "Processing";
      case "transcribing":
        return "Transcribing";
      case "summarizing":
        return "Summarizing";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <Mic className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">
          No recordings yet
        </h3>
        <p className="text-gray-400 mb-6">
          Start your first recording to see it here
        </p>
        <Link
          href="/record"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Mic className="w-5 h-5" />
          New Recording
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recordings.map((recording) => (
        <div
          key={recording.id}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => router.push(`/recording/${recording.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                    {recording.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{formatDate(new Date(recording.createdAt))}</span>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(recording.status)}
                      {getStatusLabel(recording.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-4">
              {recording.status === "completed" && (
                <>
                  <a
                    href={`/api/recordings/${recording.id}/pdf`}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {recording.shareToken && (
                    <button
                      onClick={() => copyShareLink(recording.shareToken!)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Copy share link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => deleteRecording(recording.id)}
                disabled={deletingId === recording.id}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                {deletingId === recording.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

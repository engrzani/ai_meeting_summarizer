"use client";

import { useEffect, useState, useMemo } from "react";
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
  Search,
  Filter,
  Calendar,
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

type StatusFilter = "all" | "completed" | "processing" | "error";
type SortOrder = "newest" | "oldest";

export default function RecordingsList() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
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

  const filteredRecordings = useMemo(() => {
    let filtered = [...recordings];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.title.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "processing") {
        filtered = filtered.filter((r) =>
          ["processing", "transcribing", "summarizing"].includes(r.status)
        );
      } else {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [recordings, searchQuery, statusFilter, sortOrder]);

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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Stats
  const totalRecordings = recordings.length;
  const completedCount = recordings.filter((r) => r.status === "completed").length;
  const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);

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
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{totalRecordings}</p>
          <p className="text-xs text-indigo-500 font-medium">Total Recordings</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{completedCount}</p>
          <p className="text-xs text-green-500 font-medium">Completed</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{formatDuration(totalDuration) || "0s"}</p>
          <p className="text-xs text-purple-500 font-medium">Total Duration</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== "all") && (
        <p className="text-xs text-gray-400 mb-3">
          {filteredRecordings.length} of {recordings.length} recordings
        </p>
      )}

      {/* Recordings List */}
      <div className="space-y-3">
        {filteredRecordings.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recordings match your filters</p>
          </div>
        ) : (
          filteredRecordings.map((recording) => (
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
          ))
        )}
      </div>
    </div>
  );
}

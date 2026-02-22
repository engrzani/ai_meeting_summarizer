import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Mic, Plus } from "lucide-react";
import RecordingsList from "@/components/RecordingsList";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {session.user?.name || "there"}!
          </p>
        </div>
        <Link
          href="/record"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Recording
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Mic className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Your Recordings</h2>
            <p className="text-sm text-gray-400">
              All your audio recordings and transcripts
            </p>
          </div>
        </div>
        <RecordingsList />
      </div>
    </div>
  );
}

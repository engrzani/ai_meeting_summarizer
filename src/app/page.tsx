import Link from "next/link";
import {
  Mic,
  FileText,
  Brain,
  Download,
  Share2,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-600 font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Audio Intelligence
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
              Transform Your Voice
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Into Smart Documents
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Record audio, get instant AI transcriptions and intelligent
              summaries, then export everything as professional PDF documents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From recording to sharing, we&apos;ve got your audio workflow
              covered with AI-powered tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "Live Recording",
                description:
                  "Record high-quality audio directly from your browser with real-time visualization.",
                iconColor: "#ef4444",
                bgColor: "bg-red-50",
              },
              {
                icon: FileText,
                title: "Speech-to-Text",
                description:
                  "Accurate AI transcription powered by OpenAI Whisper converts your speech to text instantly.",
                iconColor: "#3b82f6",
                bgColor: "bg-blue-50",
              },
              {
                icon: Brain,
                title: "AI Summarization",
                description:
                  "Get intelligent summaries with key points extracted automatically from your transcripts.",
                iconColor: "#8b5cf6",
                bgColor: "bg-purple-50",
              },
              {
                icon: Download,
                title: "PDF Export",
                description:
                  "Export your transcripts and summaries as professionally formatted PDF documents.",
                iconColor: "#22c55e",
                bgColor: "bg-green-50",
              },
              {
                icon: Shield,
                title: "Secure Storage",
                description:
                  "All your recordings and documents are securely stored in the cloud with encryption.",
                iconColor: "#f59e0b",
                bgColor: "bg-amber-50",
              },
              {
                icon: Share2,
                title: "Easy Sharing",
                description:
                  "Share your transcripts and summaries with anyone using secure shareable links.",
                iconColor: "#14b8a6",
                bgColor: "bg-teal-50",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon
                    className="w-7 h-7"
                    style={{ color: feature.iconColor }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-500">
              Three simple steps to transform your audio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Record",
                description:
                  "Click the microphone button and start speaking. Our recorder captures high-quality audio.",
              },
              {
                step: "02",
                title: "Process",
                description:
                  "AI automatically transcribes your speech and generates a structured summary.",
              },
              {
                step: "03",
                title: "Export & Share",
                description:
                  "Download as PDF or share via a secure link. Your content, your way.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-bold text-indigo-100 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-10 sm:p-16 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              Join VoiceScribe today and transform your audio recordings into
              actionable documents.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} VoiceScribe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

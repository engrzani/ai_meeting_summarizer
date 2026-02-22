# VoiceScribe - AI Audio Transcription & Summarization

Record audio, convert speech to text with AI, generate intelligent summaries, and export professional PDFs.

## Features

- **Live Audio Recording** - Record directly from your browser microphone with real-time audio visualization
- **Speech-to-Text** - AI-powered transcription using OpenAI Whisper
- **AI Summarization** - Automatic key-point extraction using GPT-4o-mini
- **PDF Export** - Professional PDF documents with transcript + summary
- **Secure Storage** - Cloud file storage via Vercel Blob
- **Shareable Links** - Share transcripts with unique secure URLs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 |
| Backend | Next.js API Routes (Node.js) |
| Speech Recognition | OpenAI Whisper API |
| Summarization | OpenAI GPT-4o-mini |
| Database | PostgreSQL + Prisma 7 |
| File Storage | Vercel Blob |
| PDF Generation | PDFKit |
| Authentication | NextAuth v5 (Auth.js) |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Vercel Blob storage token

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd uzam1

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -base64 32`) |
| `OPENAI_API_KEY` | OpenAI API key for Whisper & GPT |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |

## Deploy to Vercel

1. Push code to a GitHub repository
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables in Vercel project settings:
   - `DATABASE_URL` - Your PostgreSQL connection string (e.g., from Neon, Supabase, or Railway)
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `OPENAI_API_KEY` - From [OpenAI Platform](https://platform.openai.com/api-keys)
   - `BLOB_READ_WRITE_TOKEN` - Create a Blob store in Vercel and get the token
4. Deploy!

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication endpoints
│   │   ├── recordings/     # Recording CRUD + PDF generation
│   │   └── share/          # Public sharing endpoint
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   ├── record/             # Audio recording page
│   ├── recording/[id]/     # Recording detail view
│   ├── register/           # Registration page
│   ├── share/[token]/      # Public shared view
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/
│   ├── AudioRecorder.tsx   # Microphone recording with visualization
│   ├── Navbar.tsx          # Navigation bar
│   ├── Providers.tsx       # Session provider wrapper
│   └── RecordingsList.tsx  # Recordings list component
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── openai.ts           # OpenAI client
│   ├── prisma.ts           # Prisma client singleton
│   └── utils.ts            # Utility functions
└── middleware.ts           # Auth middleware
```

## License

MIT

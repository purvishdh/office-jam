# Office Jukebox 🎵

Real-time collaborative music player for teams. Create groups, add YouTube songs, and sync playback across all devices.

✅ **Status: FULLY FUNCTIONAL**  
HTML5 audio with RapidAPI streaming - works perfectly on mobile with background playback!

## ✨ Features

- 🎵 **Real-time sync** — All devices play together
- 📱 **Mobile support** — True background playback with screen lock support
- 🎮 **Lock screen controls** — Full Media Session API integration  
- 🌐 **Public discovery** — Browse and join public listening parties
- 🔄 **Live playlist** — Add/remove/reorder songs collaboratively
- ⚡ **Instant updates** — Powered by Supabase Realtime
- 🎯 **Reliable streaming** — Multi-source RapidAPI waterfall system

## 🔧 Technical Overview

- **Frontend:** Next.js 15 (App Router) + React + TypeScript
- **Backend:** Supabase (Database + Realtime)
- **Audio:** HTML5 Audio + RapidAPI streaming services
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React Query for data fetching and caching

### Audio Streaming Architecture

1. **RapidAPI Waterfall** - YouTube MP36, YouTube Downloader Video, YouTube Audio & Video URL
2. **HTML5 Audio Element** - Native browser audio with background support
3. **Media Session API** - Lock screen controls and metadata
4. **Wake Lock API** - Prevents screen dimming during playback

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Prerequisites

- Node.js 18+
- npm or yarn  
- Supabase account (for database)
- YouTube Data API key (for song metadata)
- RapidAPI account (for audio streaming)

## Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_api_key
RAPIDAPI_KEY=your_rapidapi_key
```

## 📚 Complete Documentation

This project now includes **comprehensive documentation** covering architecture, issues, and implementation guides:

| Document | Purpose | Length |
|----------|---------|--------|
| **[QUICK_START.md](QUICK_START.md)** | 5-minute orientation for new developers | 5 min |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Executive summary of the app | 10 min |
| **[CRITICAL_ISSUES.md](CRITICAL_ISSUES.md)** | The YouTube IFrame bug + 7-step fix | 15 min read / 6.5 hrs implementation |
| **[APP_ARCHITECTURE.md](APP_ARCHITECTURE.md)** | Complete system design & how it works | 30 min |
| **[CODE_REVIEW.md](CODE_REVIEW.md)** | 10 code issues + quality improvements | 20 min |
| **[VISUAL_GUIDE.md](VISUAL_GUIDE.md)** | Architecture diagrams & flows | 15 min |
| **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** | Navigation guide for all docs | 5 min |

### Where to Start?

**Pick one based on your role:**

👤 **New Developer:** Start with [QUICK_START.md](QUICK_START.md) (5 min)  
🔧 **Implementing the Fix:** Read [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) (15 min + 6.5 hrs coding)  
📊 **Understanding the System:** Read [APP_ARCHITECTURE.md](APP_ARCHITECTURE.md) (30 min)  
🎯 **Planning Features:** Read [CODE_REVIEW.md](CODE_REVIEW.md) + [APP_ARCHITECTURE.md](APP_ARCHITECTURE.md)  
🎨 **Visual Learner:** Start with [VISUAL_GUIDE.md](VISUAL_GUIDE.md)  

---

## 🚨 Current Status

**MVP is BLOCKED on one critical issue:**

The app doesn't work on mobile phones when the screen is locked because the YouTube IFrame API gets suspended by the browser.

**→ See [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) for the 7-step fix (6.5 hours)**

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com) from the creators of Next.js.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

### Step 3: Share Your App

Once deployed, you'll get a URL like `https://your-app.vercel.app`. Share this with your team members and they can:
- Access it on any device (mobile, tablet, desktop)
- Create or join group rooms
- Scan QR codes to instantly join groups
- Control music in real-time

### Mobile Device Access

The app is fully responsive and works great on mobile devices:
- **iPhone/iPad** - Open in Safari or any browser
- **Android** - Open in Chrome or any browser
- **Desktop** - Works on all modern browsers

Simply navigate to your Vercel URL on any device and start collaborating!

## Technology Stack

- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend & Database
- **YouTube API** - Music streaming
- **Geolocation API** - Location-based features

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## License

MIT

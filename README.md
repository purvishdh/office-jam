# Office Jukebox 🎵

A collaborative music player for teams to enjoy music together in real-time. Share a QR code with your team and everyone can see and control the playlist from any device.

## Features

- 🎵 **Collaborative Playlist** - Team members can add and manage songs together
- 📱 **Mobile Friendly** - Works seamlessly on all devices (phones, tablets, desktops)
- 🔗 **QR Code Sharing** - Scan QR code to join group rooms instantly
- 🎯 **Real-time Sync** - All players stay in sync across devices
- 🌍 **Geolocation** - Find nearby groups in your area
- 🎸 **YouTube Integration** - Stream songs from YouTube

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)
- YouTube Data API key (optional, for full functionality)

## Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

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

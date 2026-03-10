# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Office Jukebox** — a real-time collaborative music player for offices. Users create a group, add YouTube songs to a shared queue, and control playback together. Built with Next.js 15 (App Router) + Supabase.

All application code lives in `office-jukebox/`.

## Commands

Run from `office-jukebox/`:

```bash
npm run dev     # Development server (Turbopack)
npm run build   # Production build
npm run lint    # ESLint
```

## Environment

`office-jukebox/.env.local` must contain:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Architecture

### Data Flow

1. User lands on `/` (`src/app/page.tsx`) and clicks "Start Office Music Party"
2. A row is inserted into Supabase `groups` table; the returned `id` drives all subsequent operations
3. The main layout renders three components: `<Playlist>`, `<QRCode>`, and `<Player>`, all receiving `groupId`
4. The `playlist` column in `groups` stores the full song array as JSONB; mutations replace the entire array

### Real-time Sync

`Player.tsx` uses two Supabase Realtime mechanisms on channel `group:{groupId}`:
- **Postgres Changes** — watches `groups` table for playlist updates to swap the audio source
- **Broadcast** — `play-pause` events sync playback state across all connected clients

### External Music Source

Songs are fetched using a **RapidAPI waterfall system**. When a YouTube URL is added:
1. `/api/song` fetches metadata from YouTube Data API
2. `/api/stream` tries multiple RapidAPI services in order (YouTube MP36 → YouTube Downloader → YouTube Audio & Video URL)
3. Returns direct audio stream URL stored as `piped_url` in the song object
4. HTML5 `<audio>` element plays the stream with reliable background playback

### Supabase Schema

```typescript
// groups table
{
  id: string          // uuid, primary key
  name: string
  playlist: Song[]    // JSONB array
  current_index?: number
}

// Song shape (stored in playlist JSONB)
{
  id: string          // `${Date.now()}-${random}`
  title: string
  piped_url: string   // audio stream URL from Piped
  thumbnail: string
  duration: string    // "MM:SS"
  votes: number
  order: number       // playlist position index
}
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@hello-pangea/dnd` | Drag-and-drop playlist reordering (use this, not `react-beautiful-dnd`) |
| `@tanstack/react-query` | Server state for Supabase queries/mutations |
| `qrcode.react` | QR code SVG for sharing group invite link |
| `react-hot-toast` | Toast notifications |
| Tailwind CSS v4 | Styling (via `@tailwindcss/postcss`) |

### Incomplete / Scaffolded

- `src/app/group/[id]/page.tsx` — route defined but empty (intended for shareable group URLs)
- `src/hooks/useGroup.ts` — empty hook file
- `src/lib/edge-function.ts` — empty
- `src/components/DragDropZone.tsx` — empty

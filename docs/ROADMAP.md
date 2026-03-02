# Office Jukebox — Production Roadmap

## Current Architecture (as of Feb 2026)

```
User → Next.js 15 (App Router)
         ├── Supabase Realtime  (postgres_changes + presence)
         ├── YouTube IFrame API (hidden 1×1px iframe, audio only)
         └── YouTube Data API v3 (/api/song route — metadata fetch)
```

### What works today
- Create/join group room via URL or QR code
- Add songs via YouTube URL → metadata fetched from YouTube Data API v3
- Drag-and-drop reorder, vote to bump songs
- Collaborative playback sync via `is_playing` + `playback_started_at` timestamp in Supabase
- Member presence (Supabase Realtime presence channel)
- Geolocation-based nearby group discovery (10 m radius, Haversine)
- Media Session API wired up (lock screen controls declared)

---

## Problem: Music Stops on Mobile / Tab Backgrounded

### Root Cause
The app uses the **YouTube IFrame API** (`YT.Player`) embedded in a hidden `1×1px` div.
Mobile browsers (Safari iOS, Chrome Android) **suspend JavaScript and throttle/kill iframes** when:
- Screen locks
- Tab is backgrounded
- App switcher is open

The `YT.Player` lives inside that iframe. When the browser freezes the iframe's JS context, playback stops and the Supabase sync loop also freezes — so no recovery happens.

### Why `ytdl-core` won't fix this
`ytdl-core` is a Node.js server-side library. It can't play audio in the browser. It also requires downloading the video stream to your server, which violates YouTube ToS and creates massive bandwidth costs.

---

## Fix: Background Playback (Implement Now)

### Solution: Switch to `<audio>` element + Piped API stream URL

The Piped API (`pipedapi.kavin.rocks`) returns a direct audio stream URL for any YouTube video ID. A native `<audio>` element keeps playing when the tab is backgrounded on mobile, unlike an iframe.

The codebase already has `usePlayer.ts` with a full `<audio>` implementation — it just got replaced by the YouTube IFrame version. The fix is to **restore the audio element approach and add a proper stream URL proxy**.

### Implementation Steps

#### Step 1 — Add a server-side stream proxy route

Create `src/app/api/stream/route.ts`:

```ts
// Fetches the Piped audio stream URL server-side and returns it.
// This avoids CORS issues when Piped blocks direct browser requests.
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('v')
  if (!videoId) return NextResponse.json({ error: 'Missing video id' }, { status: 400 })

  const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Piped error' }, { status: 502 })

  const data = await res.json()
  // Pick highest quality audio-only stream
  const stream = data.audioStreams?.find((s: { mimeType: string }) =>
    s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/webm')
  ) ?? data.audioStreams?.[0]

  if (!stream?.url) return NextResponse.json({ error: 'No audio stream' }, { status: 404 })

  return NextResponse.json({ url: stream.url, expires: stream.expires })
}
```

#### Step 2 — Update Song type to store `piped_url`

In `src/lib/types.ts`, add:
```ts
piped_url?: string   // direct audio stream URL, fetched at add-time
piped_url_expires?: number  // unix timestamp — refresh if expired
```

#### Step 3 — Fetch stream URL when adding song

In `src/lib/piped.ts`, after getting metadata from YouTube API, also call `/api/stream?v={videoId}` and store `piped_url` in the Song object before saving to Supabase.

#### Step 4 — Rewrite `usePlayer.ts` to use `<audio>`

Replace the YouTube IFrame player with:

```ts
const audio = new Audio()
audio.src = currentSong.piped_url
audio.play()
```

Key behaviours to preserve:
- `playback_started_at` timestamp sync (already works with audio element)
- `handleEnded` → advance `current_index` in Supabase
- Media Session API handlers (already implemented in old `usePlayer.ts`)
- Progress polling via `audio.currentTime / audio.duration`

#### Step 5 — Handle stream URL expiry

Piped stream URLs expire (typically ~6 hours). On `audio.error` event:
- Re-fetch `/api/stream?v={videoId}`
- Update `piped_url` in Supabase
- Reload audio and resume from correct position

#### Step 6 — Wake Lock API (prevent screen sleep on host device)

```ts
// In usePlayer.ts, when playback starts:
const wakeLock = await navigator.wakeLock?.request('screen')
// Release when paused:
wakeLock?.release()
```

This keeps the host device's screen alive so the audio context is never frozen.

#### Step 7 — Remove YouTube IFrame dependency

Delete the hidden `<div id="yt-player-container" />` from `Player.tsx`.
Remove `src/types/youtube.d.ts` and the `loadYTScript` function.
The thumbnail and title still come from YouTube Data API v3 — that's fine.

---

## Architecture After Fix

```
User adds song:
  YouTube URL → /api/song (YouTube Data API v3) → title, thumbnail, duration
             → /api/stream (Piped API)           → piped_url (audio stream)
             → Supabase groups.playlist[]         (stored with piped_url)

Playback:
  Supabase Realtime → usePlayer → <audio src={piped_url}> → plays in background
  Media Session API → lock screen controls → update Supabase → all clients sync
  Wake Lock API     → prevents screen sleep on host device
```

---

## Future Improvements (Priority Order)

### P1 — Stability & UX (next sprint)

| # | Item | Why |
|---|------|-----|
| 1 | **Stream URL refresh** | Piped URLs expire ~6h; auto-refresh on `audio.error` |
| 2 | **Fallback Piped instances** | `pipedapi.kavin.rocks` goes down regularly; maintain a list of mirrors and try next on 502 |
| 3 | **Optimistic UI for playlist mutations** | Currently replaces whole array in Supabase; add `useMutation` optimistic updates so the UI doesn't flicker |
| 4 | **Volume control** | `audio.volume` slider in Player UI |
| 5 | **Current song position display** | Show `MM:SS / MM:SS` not just a progress bar |

### P2 — Reliability (within 2 months)

| # | Item | Why |
|---|------|-----|
| 6 | **Self-host Piped instance** | Public Piped is rate-limited and unreliable for production; run your own on a $5 VPS |
| 7 | **Stream URL pre-fetch** | Pre-fetch `piped_url` for the next 2 songs while current song plays, so there's no gap |
| 8 | **Error boundaries** | Wrap `<Player>` and `<Playlist>` in React error boundaries so one crash doesn't kill the room |
| 9 | **Reconnect on Supabase channel drop** | Add exponential backoff reconnect to `useGroup.ts` channel subscription |
| 10 | **PWA manifest + service worker** | Enables "Add to Home Screen" on mobile; service worker can keep audio playing more reliably |

### P3 — Features (roadmap)

| # | Item | Why |
|---|------|-----|
| 11 | **DJ mode** | One designated user controls skip/pause; others can only vote |
| 12 | **Vote-to-skip** | If >50% of members vote skip, auto-advance |
| 13 | **Group persistence** | Currently groups have no auth; add optional password or expiry |
| 14 | **Song history** | Show last N played songs |
| 15 | **Crossfade** | Fade out last 5s of track, fade in next |
| 16 | **Spotify/SoundCloud support** | Replace YouTube-specific logic with an abstract `MusicSource` interface |

### P4 — Infrastructure (production hardening)

| # | Item | Why |
|---|------|-----|
| 17 | **Supabase RLS policies** | Currently any client can update any group; add row-level security |
| 18 | **Rate limiting on `/api/song`** | YouTube API has daily quota; add per-IP rate limiting via Upstash Redis |
| 19 | **Edge runtime for `/api/stream`** | Move stream proxy to `export const runtime = 'edge'` for lower latency |
| 20 | **Monitoring** | Add Sentry for error tracking; log Piped failures to catch mirrors going down |

---

## Files To Change for Background Playback Fix

```
src/app/api/stream/route.ts     ← CREATE (Piped proxy)
src/lib/types.ts                ← ADD piped_url, piped_url_expires to Song
src/lib/piped.ts                ← FETCH piped_url when building Song object
src/hooks/usePlayer.ts          ← REWRITE: audio element instead of YT iframe
src/components/Player.tsx       ← REMOVE yt-player-container div
src/types/youtube.d.ts          ← DELETE (no longer needed)
```

---

## Piped API Mirrors (fallback list)

If the primary instance is down, try these in order:

```
https://pipedapi.kavin.rocks
https://pipedapi.adminforge.de
https://piped-api.garudalinux.org
https://api.piped.projectsegfau.lt
```

Implement as a loop: try each, break on first `200 OK`.

---

## Quick Reference: Key Files

| File | Role |
|------|------|
| `src/app/group/[id]/GroupRoom.tsx` | Main room layout, composes all components |
| `src/hooks/useGroup.ts` | Supabase Realtime subscription, React Query cache |
| `src/hooks/usePlayer.ts` | Audio playback engine — the file to rewrite |
| `src/hooks/useMembers.ts` | Presence tracking via Supabase channel |
| `src/components/Player.tsx` | Playback UI (controls, progress bar, artwork) |
| `src/components/Playlist.tsx` | Song queue with drag-drop and voting |
| `src/app/api/song/route.ts` | YouTube Data API v3 — fetches title/thumbnail/duration |
| `src/app/api/stream/route.ts` | (to create) Piped proxy — fetches audio stream URL |
| `src/lib/types.ts` | Song and Group TypeScript interfaces |
| `src/lib/piped.ts` | YouTube URL parsing + song fetch orchestration |

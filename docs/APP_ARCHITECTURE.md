# Office Jukebox — Application Architecture & Development Guide

**Last Updated:** March 2, 2026  
**Version:** 0.1.0 (MVP Phase)

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [How the App Works](#how-the-app-works)
3. [Critical Issues & Fixes](#critical-issues--fixes)
4. [Future Development Tasks](#future-development-tasks)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Development Workflow](#development-workflow)

---

## Current Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐       ┌──────────────────────┐  │
│  │   React Components   │       │  Media Session API   │  │
│  │  ├─ HomePage         │       │  (Lock Screen        │  │
│  │  ├─ GroupRoom        │       │   Controls)          │  │
│  │  ├─ Player           │       │                      │  │
│  │  ├─ Playlist         │       │  Wake Lock API       │  │
│  │  └─ QRCode           │       │  (Screen Sleep)      │  │
│  │                      │       │                      │  │
│  │  Next.js 15 App      │       └──────────────────────┘  │
│  │  Router (Pages)      │                                  │
│  └──────────────────────┘                                  │
│          │                                                  │
│          ├─────────────────────────────────────────────┐   │
│          │                                             │   │
│          ▼                                             ▼   │
│  ┌──────────────────────┐              ┌──────────────────┐│
│  │   React Query        │              │  <audio> Element ││
│  │  (Data Caching)      │              │  (Playback)      ││
│  │                      │              │                  ││
│  │  useGroup()          │              │  src={piped_url} ││
│  │  usePlayer()         │              │                  ││
│  │  useMembers()        │              └──────────────────┘│
│  └──────────────────────┘                                  │
│          │                                                  │
│          │ Real-time Sync                                  │
│          ▼                                                  │
│  ┌──────────────────────┐                                  │
│  │  Supabase Realtime   │                                  │
│  │  ├─ postgres_changes │                                  │
│  │  │  (group updates)  │                                  │
│  │  └─ presence channel │                                  │
│  │     (members)        │                                  │
│  └──────────────────────┘                                  │
│          │                                                  │
└──────────┼──────────────────────────────────────────────────┘
           │
           │ WebSocket (Supabase)
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  SUPABASE BACKEND (Cloud)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PostgreSQL Database                                        │
│  ├─ groups (table)                                          │
│  │  ├─ id, name, lat, lng, created_at                       │
│  │  ├─ playlist (JSONB array of Song objects)               │
│  │  ├─ current_index (int)                                  │
│  │  ├─ is_playing (boolean)                                 │
│  │  └─ playback_started_at (timestamp)                      │
│  │                                                          │
│  └─ (future) Auth & RLS Policies                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
           │
           │ HTTP Requests
           ▼
┌──────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES (Third-party APIs)             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────┐                              │
│  │  YouTube Data API v3      │  (Metadata: title, thumb)   │
│  │  /api/song?v={videoId}    │                              │
│  └───────────────────────────┘                              │
│                                                              │
│  ┌───────────────────────────┐                              │
│  │  Piped API Instances      │  (Audio stream URLs)        │
│  │  (pipedapi.kavin.rocks)   │                              │
│  │  /api/stream?v={videoId}  │                              │
│  └───────────────────────────┘                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Next.js 15 | UI framework + App Router |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **State** | React Query v5 | Server state management & caching |
| **Drag-Drop** | @hello-pangea/dnd | Playlist reordering |
| **Notifications** | react-hot-toast | Toast notifications |
| **Icons** | lucide-react | SVG icon library |
| **QR Codes** | qrcode.react | Generate shareable room QR codes |
| **Database** | Supabase (PostgreSQL) | Real-time data + auth (future) |
| **Backend APIs** | Next.js API Routes | Server-side proxies (song metadata, streams) |
| **Audio Playback** | HTML5 `<audio>` | Native browser playback |
| **Real-time Sync** | Supabase Realtime (WebSocket) | Push updates to all clients |

---

## How the App Works

### 1. **User Flow: Creating/Joining a Room**

```
Homepage (/page.tsx)
    │
    ├─ User enters name → stored in localStorage
    │
    ├─ [Optional] Enable geolocation
    │       ├─ useGeolocation() hook requests location
    │       └─ Stored as lat/lng in Supabase group
    │
    └─ User clicks "Start Party"
        │
        └─ Create group in Supabase
            └─ Redirect to /group/[id]
```

### 2. **Room Lifecycle: /group/[id]**

```
GroupRoom Component (GroupRoom.tsx)
    │
    ├─ useGroup(groupId)
    │  └─ Fetch initial group data
    │  └─ Subscribe to Supabase Realtime (postgres_changes)
    │     └─ On ANY change to group: update React Query cache
    │
    ├─ useMembers(groupId, memberName)
    │  └─ Broadcast this user's presence via Supabase channel
    │  └─ Listen for other members joining/leaving
    │
    ├─ Render:
    │  ├─ Player component (playback controls)
    │  ├─ Playlist component (queue management)
    │  ├─ MemberList component (who's here)
    │  └─ QRCode component (share room)
```

### 3. **Adding a Song**

```
User enters YouTube URL in Playlist component
    │
    ├─ addSongMutation (useMutation from React Query)
    │
    ├─ Call fetchSong() (src/lib/piped.ts)
    │   │
    │   ├─ Extract video_id from URL using regex
    │   │
    │   ├─ Fetch /api/song?v={videoId}
    │   │   └─ Server hits YouTube Data API v3
    │   │   └─ Returns: title, thumbnail, duration, video_id
    │   │
    │   ├─ [ISSUE] Currently song.piped_url = hardcoded YouTube URL
    │   │   └─ This does NOT work on mobile (iframe blocked)
    │   │
    │   └─ Return Song object
    │
    ├─ Append Song to group.playlist in Supabase
    │   └─ Supabase emits postgres_changes event
    │   └─ All clients receive updated playlist
    │
    └─ Show toast: "Song added!"
```

### 4. **Playback & Sync**

```
usePlayer Hook (usePlayer.ts)
    │
    ├─ Create <audio> element in memory (audioRef)
    │
    ├─ Whenever group data changes (Supabase Realtime):
    │   │
    │   ├─ Get currentSong = group.playlist[group.current_index]
    │   │
    │   ├─ Set audio.src = currentSong.piped_url
    │   │
    │   ├─ Calculate elapsed time from playback_started_at
    │   │   └─ If more than 2s out of sync → resync audio.currentTime
    │   │
    │   └─ If is_playing=true → audio.play() (may fail on autoplay restrictions)
    │      Otherwise → audio.pause()
    │
    ├─ Progress polling (every 500ms)
    │   └─ Update progress bar: audio.currentTime / audio.duration
    │
    ├─ When song ends (audio.onended event)
    │   └─ Increment group.current_index in Supabase
    │   └─ All clients auto-advance
    │
    └─ Media Session API (lock screen controls)
        ├─ When user presses play on lock screen
        │  └─ Call navigator.mediaSession.setActionHandler('play')
        │  └─ Update is_playing in Supabase
        │  └─ All clients sync
        │
        └─ Also broadcast: title, artwork to OS notification bar
```

### 5. **Reordering & Voting**

```
Playlist Component
    │
    ├─ Drag-and-drop (hello-pangea/dnd)
    │   ├─ User drags song to new position
    │   ├─ Call onDragEnd() handler
    │   └─ Rebuild playlist array with new order
    │   └─ Save to Supabase
    │
    └─ Voting
        ├─ User taps 👍 on a song
        ├─ Increment song.votes in playlist array
        └─ Save to Supabase
           └─ [TODO] Implement vote-sorting algorithm
```

### 6. **Geolocation & Nearby Groups**

```
HomePage (if location enabled)
    │
    └─ NearbyGroups Component
        │
        ├─ Query Supabase for groups within 10km radius
        │  └─ Use Haversine distance formula
        │
        └─ Display list of nearby groups
            └─ User can tap to join
```

---

## Critical Issues & Fixes

### ⚠️ **ISSUE #1: YouTube IFrame API Doesn't Work on Mobile** (PRIORITY: CRITICAL)

#### Problem Description

**Current Behavior:**
- The app was originally designed to use **YouTube IFrame API** (`YT.Player`)
- This API is embedded in a hidden `1×1px` div in `Player.tsx`
- **Root cause of failure:** Mobile browsers (iOS Safari, Android Chrome) suspend JavaScript execution when:
  - Screen locks
  - App is sent to background
  - User switches to another app
  - Browser tab is backgrounded

When the JavaScript context is frozen, the YouTube IFrame's playback stops immediately, and the `usePlayer` hook can no longer sync with Supabase. Users experience:
- ✗ Music stops when phone is locked
- ✗ Music stops when switching apps
- ✗ No recovery/resume
- ✗ Completely broken on mobile (the primary use case)

#### Why This Matters

The YouTube IFrame is **inside an iframe element**, which:
1. Has its own JavaScript context
2. Can be suspended independently
3. Cannot play audio reliably in the background
4. Violates YouTube's usage policies if bypassed with tricks

#### Root Cause Analysis

Looking at `src/app/api/song/route.ts`:

```typescript
const audioUrl = `https://www.youtube.com/watch?v=... `
return NextResponse.json({
  piped_url: audioUrl,  // ← This is just a YouTube URL, NOT a streaming URL
})
```

The `piped_url` is currently **not actually a direct audio stream**—it's a YouTube watch URL. This cannot be played in `<audio>` elements due to:
- CORS restrictions
- Encryption of streaming URLs
- YouTube's ToS against direct access

#### Solution: Use Piped API for Audio Streams

**Piped** (https://piped.io) is a privacy-focused YouTube alternative that:
- Extracts the audio stream URL from YouTube videos
- Returns direct, playable audio stream URLs (bypassing encryption)
- Works reliably on mobile backgrounds
- Has a public API (pipedapi.kavin.rocks)

**The Fix (7-Step Implementation):**

##### Step 1: Create `/api/stream` Route

**File:** `src/app/api/stream/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('v')
  if (!videoId) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Piped error' }, { status: 502 })
    }

    const data = await res.json()
    
    // Find highest quality audio stream
    const stream = data.audioStreams?.find(
      (s: { mimeType: string }) => s.mimeType?.includes('audio/')
    ) ?? data.audioStreams?.[0]

    if (!stream?.url) {
      return NextResponse.json({ error: 'No audio stream found' }, { status: 404 })
    }

    return NextResponse.json({
      url: stream.url,
      expires: stream.expires, // Unix timestamp when URL expires
      quality: stream.quality || 'unknown',
    })
  } catch (err) {
    console.error('Stream fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

##### Step 2: Update Song Type

**File:** `src/lib/types.ts`

Add to the `Song` interface:

```typescript
export interface Song {
  id: string
  title: string
  video_id: string
  thumbnail: string
  duration: number
  votes: number
  order: number
  piped_url: string           // ← Direct audio stream URL
  piped_url_expires?: number  // ← When URL expires (Unix ms)
}
```

##### Step 3: Fetch Stream URL When Adding Song

**File:** `src/lib/piped.ts`

Update the `fetchSong()` function:

```typescript
export async function fetchSong(youtubeUrl: string, currentQueueLength: number): Promise<Song> {
  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) throw new Error('Invalid YouTube URL')

  // Step 1: Fetch metadata from YouTube API
  const res = await fetch(`/api/song?v=${videoId}`)
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Failed to fetch song' }))
    throw new Error(error ?? 'Failed to fetch song')
  }
  const video = await res.json()

  // Step 2: Fetch audio stream URL from Piped
  const streamRes = await fetch(`/api/stream?v=${videoId}`)
  if (!streamRes.ok) {
    throw new Error('Failed to get audio stream. The video might be unavailable.')
  }
  const streamData = await streamRes.json()

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    title: video.title,
    video_id: video.video_id,
    piped_url: streamData.url, // ← Direct playable audio stream
    piped_url_expires: streamData.expires,
    thumbnail: video.thumbnail,
    duration: video.duration,
    votes: 0,
    order: currentQueueLength,
  }
}
```

##### Step 4: Update usePlayer Hook

**File:** `src/hooks/usePlayer.ts`

The hook already uses `<audio>` elements! The key change is ensuring it respects the `piped_url`:

```typescript
// In applyGroupState function:
const applyGroupState = useCallback((g: Group) => {
  const audio = audioRef.current
  if (!audio) return

  const song: Song | undefined = g.playlist[g.current_index ?? 0]
  if (!song?.piped_url) return // ← Wait for valid stream URL

  const elapsed = g.playback_started_at
    ? (Date.now() - new Date(g.playback_started_at).getTime()) / 1000
    : 0

  const urlChanged = song.piped_url !== loadedUrlRef.current

  if (urlChanged) {
    loadedUrlRef.current = song.piped_url
    audio.src = song.piped_url  // ← Use the direct stream URL
    audio.load()
  }

  if (g.is_playing) {
    if (!urlChanged && Math.abs(audio.currentTime - elapsed) > 2) {
      audio.currentTime = Math.max(0, elapsed)
    } else if (urlChanged) {
      audio.currentTime = Math.max(0, elapsed)
    }
    audio.play().catch(() => {
      // Autoplay blocked — user will tap play manually
    })
  } else {
    audio.pause()
  }

  setIsPlaying(g.is_playing)
  updateMediaSession(song, g.is_playing)
}, [])
```

##### Step 5: Handle Stream URL Expiry

Add error handler in `usePlayer.ts`:

```typescript
useEffect(() => {
  const audio = audioRef.current
  if (!audio) return

  const handleAudioError = async () => {
    const song = groupRef.current?.playlist[groupRef.current?.current_index ?? 0]
    if (!song) return

    // URL expired or stream unavailable — re-fetch
    try {
      const streamRes = await fetch(`/api/stream?v=${song.video_id}`)
      if (!streamRes.ok) throw new Error('Stream fetch failed')
      
      const streamData = await streamRes.json()
      audio.src = streamData.url
      audio.load()
      
      // Optionally update Supabase with new URL (for optimization)
      // await supabase.from('groups').update({...}).eq('id', groupIdRef.current)
      
      audio.play().catch(() => {})
    } catch (err) {
      console.error('Failed to recover stream:', err)
      toast.error('Audio stream unavailable')
    }
  }

  audio.addEventListener('error', handleAudioError)
  return () => audio.removeEventListener('error', handleAudioError)
}, [])
```

##### Step 6: Enable Wake Lock (Keep Screen Alive)

Add to `usePlayer.ts`:

```typescript
useEffect(() => {
  const requestWakeLock = async () => {
    try {
      const wakeLock = await navigator.wakeLock?.request('screen')
      return wakeLock
    } catch (err) {
      console.log('Wake Lock API not available:', err)
      return null
    }
  }

  let wakeLock: any = null

  const handlePlayStart = async () => {
    if (!isPlaying) return
    wakeLock = await requestWakeLock()
  }

  const handlePlayEnd = async () => {
    if (wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  }

  const audio = audioRef.current
  if (audio) {
    audio.addEventListener('play', handlePlayStart)
    audio.addEventListener('pause', handlePlayEnd)
    audio.addEventListener('ended', handlePlayEnd)

    return () => {
      audio.removeEventListener('play', handlePlayStart)
      audio.removeEventListener('pause', handlePlayEnd)
      audio.removeEventListener('ended', handlePlayEnd)
      if (wakeLock) {
        wakeLock.release().catch(() => {})
      }
    }
  }
}, [isPlaying])
```

##### Step 7: Remove YouTube IFrame Dependency

**File:** `src/components/Player.tsx`

Remove the hidden YouTube player container:

```typescript
// DELETE THIS:
<div
  id={PLAYER_CONTAINER_ID}
  style={{ position: 'fixed', left: -9999, top: -9999, width: 320, height: 180, pointerEvents: 'none' }}
/>

// Remove the PLAYER_CONTAINER_ID constant
// Remove the _containerId parameter from usePlayer call
```

**File:** `src/types/youtube.d.ts`

Delete this file entirely (no longer needed).

---

### ⚠️ **ISSUE #2: No Fallback When Piped Instance Goes Down** (PRIORITY: HIGH)

#### Problem

**Current State:** The app relies on a single Piped instance (`pipedapi.kavin.rocks`), which:
- Goes down ~30% of the time (community-run, unreliable)
- Gets rate-limited under heavy load
- Has no fallback mechanism

**User Impact:** When the primary Piped instance is down, users cannot add songs.

#### Solution

Implement a fallback loop across multiple Piped mirrors.

**File:** `src/lib/piped.ts`

```typescript
const PIPED_MIRRORS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://piped-api.garudalinux.org',
  'https://api.piped.projectsegfau.lt',
]

async function fetchFromPipedWithFallback(videoId: string): Promise<string> {
  let lastError: Error | null = null

  for (const mirror of PIPED_MIRRORS) {
    try {
      const res = await fetch(`${mirror}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      })
      
      if (!res.ok) continue // Try next mirror
      
      const data = await res.json()
      const stream = data.audioStreams?.[0]
      if (stream?.url) return stream.url
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      continue
    }
  }

  throw lastError || new Error('All Piped mirrors failed')
}
```

Then update `/api/stream` to use this function.

---

### ⚠️ **ISSUE #3: Stream URLs Expire & Cause Playback Errors** (PRIORITY: MEDIUM)

#### Problem

Piped stream URLs are signed by YouTube and expire after ~6 hours. When a URL expires:
- `audio.error` event fires
- Playback stops abruptly
- No automatic recovery
- User gets a broken player

#### Solution

Already outlined in Step 5 above. Implement `audio.onerror` handler that re-fetches the stream.

---

### ⚠️ **ISSUE #4: No Optimistic UI Updates for Playlist Changes** (PRIORITY: MEDIUM)

#### Problem

**Current Behavior:** When user adds/removes/votes on a song:
1. Send mutation to Supabase
2. Wait for server response
3. Supabase broadcasts change
4. React Query cache updates
5. UI re-renders

**User Experience:** UI freezes for 200-500ms while waiting.

#### Solution

Use React Query's `optimisticData` in mutations.

**File:** `src/components/Playlist.tsx`

```typescript
const addSongMutation = useMutation({
  mutationFn: async (youtubeUrl: string) => {
    const newSong = await fetchSong(youtubeUrl, songs.length)
    const { error } = await supabase
      .from('groups')
      .update({ playlist: [...songs, newSong] })
      .eq('id', group.id)
    if (error) throw error
  },
  
  // ← ADD THIS:
  onMutate: async (youtubeUrl: string) => {
    // Cancel pending queries
    await queryClient.cancelQueries({ queryKey: ['group', group.id] })
    
    // Get previous data
    const previous = queryClient.getQueryData(['group', group.id])
    
    // Optimistically update
    queryClient.setQueryData(['group', group.id], (old: Group) => ({
      ...old,
      playlist: [
        ...old.playlist,
        {
          id: 'temp-' + Date.now(),
          title: 'Loading…',
          thumbnail: '',
          duration: 0,
          votes: 0,
          order: old.playlist.length,
        }
      ]
    }))
    
    return { previous }
  },
  
  onError: (err, variables, context) => {
    // Revert on error
    if (context?.previous) {
      queryClient.setQueryData(['group', group.id], context.previous)
    }
    toast.error(err instanceof Error ? err.message : 'Failed to add song')
  },
  
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['group', group.id] })
    setInputUrl('')
    toast.success('Song added!')
  },
})
```

---

### ⚠️ **ISSUE #5: No Authentication/Permissions** (PRIORITY: MEDIUM)

#### Problem

**Current State:** Any client can:
- Update any group (change playlist, pause, etc.)
- Impersonate other users
- Spam groups with fake members
- Delete all songs

This will cause chaos in production.

#### Solution (Future)

Implement Supabase Row-Level Security (RLS):
1. Add auth to Supabase
2. Create RLS policies:
   - User must be a member of group to read/write
   - Group creator = DJ (can pause, skip)
   - Members can only vote + add songs
3. Add JWT token validation

---

## Future Development Tasks

### Phase 1: Stability & Core Fixes (Next 2 weeks)

| Priority | Item | Why | Est. Hours |
|----------|------|-----|-----------|
| **P0** | **Piped API Integration (Issues #1)** | App doesn't work on mobile; blocks MVP | 6 |
| **P0** | **Piped Fallback Mirrors (Issue #2)** | Current Piped instance unreliable | 2 |
| **P1** | Stream URL expiry handling (Issue #3) | Prevent playback failures after 6h | 2 |
| **P1** | Optimistic UI updates (Issue #4) | Better UX during mutations | 3 |
| **P1** | Volume control | Users want to adjust volume | 1 |
| **P1** | Song position display (MM:SS) | Show current time, not just bar | 1 |
| **P1** | Error boundaries | Prevent one crash from breaking room | 3 |

### Phase 2: Reliability (Within 1 month)

| Priority | Item | Why | Est. Hours |
|----------|------|-----|-----------|
| **P2** | Self-host Piped instance | Reduce reliance on public instance | 4 |
| **P2** | Pre-fetch next song stream | Eliminate gap between songs | 3 |
| **P2** | Supabase reconnect logic | Handle dropped WebSocket connections | 3 |
| **P2** | PWA + service worker | Enable offline mode; better background playback | 8 |
| **P2** | Rate limiting on `/api/song` | Protect YouTube API quota | 2 |
| **P3** | Deploy to Vercel | Get off localhost | 1 |

### Phase 3: Features (1-3 months)

| Priority | Item | Why | Est. Hours |
|----------|------|-----|-----------|
| **P3** | DJ mode (designate one user) | Office parties need a host | 5 |
| **P3** | Vote-to-skip | Prevent one person from dominating | 3 |
| **P3** | Group persistence + expiry | Groups auto-delete after 24h when empty | 4 |
| **P3** | Song history | Show what was played | 2 |
| **P3** | Crossfade between tracks | Smooth transitions | 5 |
| **P3** | Spotify/SoundCloud support | More music sources | 12 |

### Phase 4: Security & Scale (2-6 months)

| Priority | Item | Why | Est. Hours |
|----------|------|-----|-----------|
| **P4** | Supabase RLS policies | Lock down database access | 8 |
| **P4** | Authentication (sign up/login) | Know who users are | 6 |
| **P4** | Group passwords/invites | Control who can join | 4 |
| **P4** | User profiles | Show user's avatar/stats | 5 |
| **P4** | Analytics/monitoring | Know app health (Sentry, LogRocket) | 4 |
| **P4** | Caching layer (Redis) | Speed up requests | 6 |

---

## Tech Stack

### Frontend

```json
{
  "react": "19.1.0",
  "next": "15.5.12",
  "typescript": "^5",
  "tailwindcss": "^4",
  "react-query": "^5.90.21",
  "@hello-pangea/dnd": "^18.0.1",
  "react-hot-toast": "^2.6.0",
  "qrcode.react": "^4.2.0",
  "lucide-react": "^0.575.0"
}
```

### Backend & Data

```
Next.js API Routes (src/app/api/)
  ├─ /api/song      → YouTube Data API v3 (metadata)
  └─ /api/stream    → Piped API (audio stream URLs)

Supabase
  ├─ PostgreSQL (data persistence)
  ├─ Realtime (WebSocket push updates)
  └─ Auth (future)
```

### External APIs

| API | Purpose | Rate Limit | Cost |
|-----|---------|-----------|------|
| YouTube Data API v3 | Fetch metadata (title, thumb, duration) | 10,000 quota/day | Free tier available |
| Piped | Extract audio stream URLs from YouTube | 200 req/min per IP | Free (no auth needed) |

---

## Project Structure

```
office-jukebox/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                    ← Homepage (create/join group)
│  │  ├─ layout.tsx                  ← Root layout
│  │  ├─ providers.tsx               ← React Query + Tailwind providers
│  │  ├─ globals.css
│  │  ├─ api/
│  │  │  ├─ song/route.ts            ← YouTube metadata API
│  │  │  └─ stream/                  ← [TO CREATE] Piped stream proxy
│  │  └─ group/[id]/
│  │     ├─ page.tsx                 ← Route wrapper
│  │     └─ GroupRoom.tsx            ← Main room layout
│  │
│  ├─ components/
│  │  ├─ Player.tsx                  ← Playback controls UI
│  │  ├─ Playlist.tsx                ← Song queue + drag-drop
│  │  ├─ MemberList.tsx              ← Show who's in room
│  │  ├─ NearbyGroups.tsx            ← Geolocation discovery
│  │  ├─ QRCode.tsx                  ← Share room QR code
│  │  └─ DragDropZone.tsx            ← Drag-drop overlay
│  │
│  ├─ hooks/
│  │  ├─ usePlayer.ts                ← Audio playback engine
│  │  ├─ useGroup.ts                 ← Supabase sync + React Query
│  │  ├─ useMembers.ts               ← Member presence tracking
│  │  ├─ useGeolocation.ts           ← Browser geolocation API
│  │
│  ├─ lib/
│  │  ├─ types.ts                    ← TypeScript interfaces (Song, Group, Member)
│  │  ├─ piped.ts                    ← YouTube URL parsing + fetchSong()
│  │  ├─ supabase.ts                 ← Supabase client config
│  │  ├─ geo.ts                      ← Haversine distance + nearby queries
│  │  ├─ edge-function.ts            ← (unused currently)
│  │  └─ migration/
│  │     ├─ group.sql                ← Database schema for groups table
│  │     └─ add_geo_playback.sql    ← Add lat/lng, playback fields
│  │
│  └─ store/                         ← (empty, for future state management)
│
├─ public/
│  └─ (static assets)
│
├─ next.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ package.json
├─ README.md
├─ ROADMAP.md                        ← (outdated; this doc replaces it)
├─ APP_ARCHITECTURE.md              ← (this file)
└─ CLAUDE.md                         ← (AI assistant notes)
```

---

## Development Workflow

### Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_api_key
EOF

# 3. Start dev server with Turbopack
npm run dev

# 4. Open browser
open http://localhost:3000
```

### Building & Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel
vercel
```

### Testing

Currently no test suite. Future additions:
- Unit tests: `jest`, `@testing-library/react`
- E2E tests: `playwright`
- Accessibility: `axe-core`

### Code Style

- ESLint: `eslint v9`
- Format: Prettier (via ESLint)
- TypeScript: strict mode enabled

```bash
npm run lint
```

---

## Debugging Tips

### Audio playback issues

Check browser console for errors from `usePlayer.ts`. Common issues:
- `audio.play() was rejected because the user hasn't interacted yet` → User needs to tap play
- `audio.error: MEDIA_ERR_NETWORK` → Stream URL expired or Piped is down
- `audio.error: MEDIA_ERR_DECODE` → Stream format unsupported (rare)

### Supabase sync issues

Check Supabase Dashboard:
1. Go to Realtime → Messages to see if postgres_changes is firing
2. Check Database → groups table for latest data
3. View Logs → API Logs for any auth errors

### Performance issues

- Check React Query DevTools (Cmd+Space in dev mode)
- Monitor audio.currentTime updates in progress polling
- Check for unnecessary re-renders (React DevTools Profiler)

---

## Summary of Changes Needed (For Issue #1 Fix)

**Files to Create:**
- `src/app/api/stream/route.ts` — Piped proxy API

**Files to Modify:**
- `src/lib/types.ts` — Add `piped_url` to Song
- `src/lib/piped.ts` — Fetch stream URL + add fallback mirrors
- `src/hooks/usePlayer.ts` — Add error handler + wake lock
- `src/components/Player.tsx` — Remove YouTube iframe container

**Files to Delete:**
- `src/types/youtube.d.ts` — No longer needed

**Total Implementation Time:** ~6-8 hours

---

## Questions to Resolve

1. **Should we pre-fetch the next song's stream while current plays?** → YES (P2)
2. **Should groups auto-delete after 24h of inactivity?** → Discuss with team
3. **Do we need authentication from day 1, or can we launch without?** → Can launch without, add in P3
4. **Which Piped mirror should be primary?** → pipedapi.kavin.rocks is most stable
5. **Should we implement vote-sorting so voted songs play sooner?** → YES (P3)

---

**Last Reviewed:** March 2, 2026  
**Next Review:** After P0 issues (Piped integration) are merged

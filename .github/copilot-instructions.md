# Office Jukebox — AI Coding Agent Instructions

## ✅ CURRENT STATUS: Production Ready

**Current Status:** WORKING — Mobile playback fully functional

**Architecture:** Modern HTML5 audio with RapidAPI streaming system provides reliable background playback across all devices. The previous YouTube IFrame issues have been completely resolved.

## Project Overview

Real-time collaborative music player for teams. Users create groups, add YouTube songs to a shared playlist, and play in sync across all devices. Built with Next.js 15 (App Router) + Supabase + HTML5 audio.

**Critical Context:** The app uses HTML5 `<audio>` with RapidAPI stream URLs for reliable background playback on mobile devices (iOS/Android). Multiple fallback services ensure audio streaming continues even if one hits quota limits.

## Architecture

### Data Flow Pattern
All state lives in Supabase `groups` table. The `playlist` column stores the full song array as JSONB. When mutating playlists (add/remove/reorder), always replace the entire array:

```typescript
// ✅ Correct: Replace entire array
await supabase.from('groups').update({ 
  playlist: [...songs, newSong] 
}).eq('id', groupId)

// ❌ Wrong: Don't try to append in SQL
```

### Real-time Sync Architecture
`usePlayer` hook subscribes to two Supabase Realtime channels:
- **Postgres Changes** — Watches `groups` table updates to sync playlist/playback state
- **Broadcast** — Sends/receives `play-pause` events for instant sync across clients

When modifying `usePlayer.ts`, preserve both subscriptions — removing either breaks multi-device sync.

### Audio Playback Implementation ✅ WORKING

**Current Status:** HTML5 `<audio>` element plays RapidAPI stream URLs with reliable background playback.

**Flow:**
1. User adds YouTube URL → `/api/song` fetches metadata from YouTube API
2. `/api/stream` tries RapidAPI services in waterfall order:
   - Try YouTube MP36 (500 req/month)
   - Fall back to YouTube Downloader (1000 req/month)
   - Fall back to YouTube Audio & Video URL (500 req/month)
   - Last resort: YouTube embed URL
3. Return direct audio stream URL in response
4. `usePlayer` hook loads URL into HTML5 `<audio>` element
5. Audio continues playing in background even when screen locks ✅

### External APIs
- **YouTube Data API v3** (`/api/song`) — Fetches metadata (title, thumbnail, duration)
- **RapidAPI Services** (`/api/stream`) — Multi-source audio stream extraction:
  - YouTube MP36 (Primary, 500 req/month)
  - YouTube Downloader Video (Fallback 1, 1,000 req/month)  
  - YouTube Audio & Video URL (Fallback 2, 500 req/month)

**Implementation:** `/api/stream/route.ts` implements waterfall strategy with proper error handling and timeouts. Returns direct audio/mpeg URLs for HTML5 playback.

## Development Workflow

### Local Development
```bash
npm run dev     # Starts Turbopack dev server on :3000
npm run build   # Production build (must pass before deploying)
npm run lint    # ESLint (runs on pre-commit)
```

### Environment Setup
Requires `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
YOUTUBE_API_KEY=...  # Server-side only (for /api/song)
```

### Database Schema
Single table: `groups`
```sql
id              uuid PRIMARY KEY
name            text
playlist        jsonb  -- Array of Song objects
current_index   int
is_playing      boolean
playback_started_at  timestamptz
lat             float
lng             float
created_at      timestamptz
```

Migration files in `src/lib/migration/*.sql` are reference docs, not auto-applied.

## Project-Specific Patterns

### Drag-and-Drop Implementation
Uses `@hello-pangea/dnd` (maintained fork of `react-beautiful-dnd`). Pattern in `Playlist.tsx`:
```typescript
<DragDropContext onDragEnd={handleReorder}>
  <Droppable droppableId="playlist">
    {(provided) => (
      <div {...provided.droppableProps} ref={provided.innerRef}>
        {songs.map((song, index) => (
          <Draggable key={song.id} draggableId={song.id} index={index}>
            {/* Song component */}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

Never forget `{provided.placeholder}` — causes visual jump bugs.

### React Query Mutation Pattern
All Supabase writes use `useMutation` with invalidation:
```typescript
const mutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase.from('groups').update(...)
    if (error) throw error
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
  onError: (err: Error) => toast.error(err.message),
})
```

Always check `error` from Supabase responses — they don't throw by default.

### Media Session API Integration
Lock screen controls work via `navigator.mediaSession`. Pattern in `usePlayer.ts`:
```typescript
navigator.mediaSession.metadata = new MediaMetadata({
  title: song.title,
  artwork: [{ src: song.thumbnail }],
})
navigator.mediaSession.setActionHandler('play', handlePlay)
```

Update metadata whenever current song changes. Action handlers must update Supabase (not just local audio element) to sync across devices.

### Geolocation Feature
`useGeolocation` hook requests user location once. `NearbyGroups` component queries Supabase for groups within 10km using PostGIS distance calculation (see `src/lib/geo.ts`).

## Common Tasks

### Adding a New Song Field
1. Update `Song` interface in `src/lib/types.ts`
2. Modify `fetchSong()` in `src/lib/piped.ts` to populate the field
3. Update `Playlist.tsx` to display/edit the field
4. Test with existing JSONB data (old songs won't have the field — handle undefined)

### Fixing Mobile Playback Issues
Check these in order:
1. Is `piped_url` a valid audio stream? (Not a YouTube watch URL)
2. Does `usePlayer` create only ONE `<audio>` element?
3. Is Media Session API calling Supabase updates (not just local play/pause)?
4. Are autoplay errors handled gracefully? (iOS requires user gesture)

### Debugging Real-time Sync
Enable React Query DevTools (`@tanstack/react-query-devtools`) — already installed. Check:
1. Is the Supabase channel subscription active? (Check browser console)
2. Are postgres_changes events firing? (Log inside the subscription callback)
3. Is `applyGroupState()` being called? (Add console.log)

## ✅ Implementation Complete

**All critical issues resolved:**

1. ✅ **Mobile playback working** — HTML5 audio with background support
2. ✅ **RapidAPI streaming implemented** — Multi-source waterfall system  
3. ✅ **Real-time sync functional** — Supabase Realtime with proper state management
4. ✅ **Media Session API** — Lock screen controls working
5. ✅ **Clean codebase** — Removed all YouTube iframe dependencies

**Ready for:** Feature additions, UI improvements, authentication system

## Documentation

**Start here:** `docs/DOCUMENTATION_INDEX.md` — Navigation guide to all docs

**Critical reading:**
- `docs/CRITICAL_ISSUES.md` — Why YouTube IFrame API is banned + Piped API implementation
- `docs/APP_ARCHITECTURE.md` — Complete system design (30 min read)

**Reference:**
- `CLAUDE.md` — Original Claude-specific conventions (older, less complete)
- `README.md` — User-facing setup guide

## Code Quality Standards

- **Type Safety** — Use TypeScript strictly. Never use `any`.
- **Error Handling** — Supabase mutations must check `.error` property
- **Responsive Design** — Mobile-first Tailwind classes (use `sm:` prefix for desktop)
- **No Dead Code** — Files like `src/lib/edge-function.ts` are empty scaffolds; mark TODOs clearly

## Known Issues & Constraints

### 🔴 Critical (Breaks Core Functionality)
1. **Mobile Playback Broken** — YouTube iframe freezes when screen locks (See `FIXES_NEEDED.md`)
2. **Invalid Audio URLs** — `/api/song` returns web page URLs, not audio streams

### ⚠️ Important (Degrades UX)
3. **No Error Boundaries** — Component crashes take down entire room
4. **No Optimistic UI** — Mutations freeze UI during network round-trip
5. **No Reconnect Logic** — Dropped Supabase connections not recovered

### 📝 Missing Features (Not Yet Built)
6. **No Authentication** — Anyone with a group ID can join (RLS not configured)
7. **Piped API Reliability** — Public instances sometimes rate-limit; may need fallback instances

**DO NOT add new features until Critical issues are fixed.** See `FIXES_NEEDED.md`.

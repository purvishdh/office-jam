# Office Jukebox — Code Review & Technical Debt

**Date:** March 2, 2026  
**Scope:** Current codebase analysis and improvement suggestions

---

## Code Quality Assessment

### ✅ What's Done Well

1. **Type Safety** — Full TypeScript, strict mode enabled
2. **Real-time Architecture** — Supabase Realtime integration is solid
3. **Component Structure** — Clear separation of concerns
4. **Responsive Design** — Mobile-first with Tailwind
5. **Hooks Pattern** — Custom hooks extract logic cleanly
6. **Error Handling (Partial)** — Mutations have `.onError` handlers

### ⚠️ Issues & Improvements

---

## Issue #1: Player Component Passes Undefined Container ID

**File:** `src/components/Player.tsx`

**Problem:**

```typescript
const PLAYER_CONTAINER_ID = 'yt-player-container'

export default function Player({ group }: { group: Group | undefined }) {
  const { isPlaying, progress, currentSong, togglePlay, skipNext, skipPrev, seek } 
    = usePlayer(group, PLAYER_CONTAINER_ID)  // ← Passes ID for YouTube iframe
```

The `_containerId` parameter in `usePlayer` is unused and confusing. This is a leftover from the (broken) YouTube IFrame implementation.

**Fix:**

```typescript
export default function Player({ group }: { group: Group | undefined }) {
  const { isPlaying, progress, currentSong, togglePlay, skipNext, skipPrev, seek } 
    = usePlayer(group)  // ← Remove unnecessary parameter
```

**Status:** Addressed in Critical Issues doc (Step 6)

---

## Issue #2: No Error Boundaries

**File:** `src/app/group/[id]/GroupRoom.tsx`

**Problem:**

If any child component throws an error (e.g., `<Player>`, `<Playlist>`), the entire room crashes and shows a blank page.

**Current:**

```typescript
return (
  <div>
    <Playlist group={group} />    {/* ← If this errors, whole app breaks */}
    <Player group={group} />
    <MemberList members={members} />
  </div>
)
```

**Fix:**

Create `src/components/ErrorBoundary.tsx`:

```typescript
'use client'
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-200">
            <h3 className="font-bold mb-2">⚠️ Something went wrong</h3>
            <p className="text-sm opacity-75">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

Then wrap components:

```typescript
return (
  <div>
    <ErrorBoundary fallback={<div>Playlist error</div>}>
      <Playlist group={group} />
    </ErrorBoundary>
    
    <ErrorBoundary fallback={<div>Player error</div>}>
      <Player group={group} />
    </ErrorBoundary>
    
    <MemberList members={members} />
  </div>
)
```

---

## Issue #3: No Loading/Error States in useGroup Hook

**File:** `src/hooks/useGroup.ts`

**Problem:**

The hook subscribes to Supabase changes but has no retry logic if the connection drops.

**Current:**

```typescript
useEffect(() => {
  if (!groupId) return

  const channel = supabase
    .channel(`group-changes:${groupId}`)
    .on('postgres_changes', { ... }, (payload) => {
      queryClient.setQueryData(['group', groupId], payload.new as Group)
    })
    .subscribe()  // ← If this fails silently, no recovery

  return () => { supabase.removeChannel(channel) }
}, [groupId, queryClient])
```

**Fix:**

```typescript
useEffect(() => {
  if (!groupId) return

  let retryCount = 0
  const MAX_RETRIES = 5

  const setupChannel = async () => {
    try {
      const channel = supabase
        .channel(`group-changes:${groupId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
          (payload) => {
            retryCount = 0  // Reset on successful update
            queryClient.setQueryData(['group', groupId], payload.new as Group)
          }
        )
        .on('system', { event: 'join' }, () => {
          console.log('Supabase channel joined')
        })
        .on('system', { event: 'leave' }, () => {
          console.warn('Supabase channel dropped')
          // Could retry here
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            if (retryCount < MAX_RETRIES) {
              retryCount++
              setTimeout(setupChannel, 1000 * retryCount)
            } else {
              console.error('Max retries reached for Supabase channel')
            }
          }
        })

      return () => { supabase.removeChannel(channel) }
    } catch (err) {
      console.error('Channel setup error:', err)
    }
  }

  const unsubscribe = setupChannel()
  return () => { unsubscribe?.then(fn => fn?.()) }
}, [groupId, queryClient])
```

---

## Issue #4: Playlist Mutation Replaces Entire Array

**File:** `src/components/Playlist.tsx`

**Problem:**

When adding/removing songs, the entire playlist is uploaded to Supabase:

```typescript
const { error } = await supabase
  .from('groups')
  .update({ playlist: [...songs, newSong] })  // ← Whole array
  .eq('id', group.id)
```

Issues:
- If multiple users edit simultaneously, last write wins (race condition)
- No optimistic UI, so UI freezes for 200-500ms
- If network fails halfway, entire playlist is lost

**Fix:**

Implement optimistic updates + better mutation structure:

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

  // ← ADD THIS SECTION:
  onMutate: async (youtubeUrl: string) => {
    // Cancel queries so Supabase update doesn't overwrite optimistic data
    await queryClient.cancelQueries({ queryKey: ['group', group.id] })
    
    // Get previous state for rollback
    const previous = queryClient.getQueryData(['group', group.id])
    
    // Optimistically update UI with loading placeholder
    queryClient.setQueryData(['group', group.id], (old: Group) => ({
      ...old,
      playlist: [
        ...old.playlist,
        {
          id: 'temp-' + Date.now(),
          title: '🔄 Loading…',
          thumbnail: '',
          duration: 0,
          votes: 0,
          order: old.playlist.length,
          piped_url: '',
          video_id: '',
        }
      ]
    }))

    return { previous }
  },

  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(['group', group.id], context.previous)
    }
    toast.error(err instanceof Error ? err.message : 'Failed to add song')
  },

  onSuccess: () => {
    // Supabase Realtime will push the authoritative state
    // This is just to clear the optimistic placeholder
    queryClient.invalidateQueries({ queryKey: ['group', group.id] })
    setInputUrl('')
    toast.success('Song added!')
  },
})
```

---

## Issue #5: No Rate Limiting on `/api/song`

**File:** `src/app/api/song/route.ts`

**Problem:**

YouTube API has a daily quota (~10,000 units/day). Without rate limiting, a malicious user can burn the quota in minutes.

**Fix:** Use Upstash Redis

```bash
npm install @upstash/redis
```

Create `.env.local`:

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Update `src/app/api/song/route.ts`:

```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function rateLimit(ip: string): Promise<boolean> {
  const key = `api:song:${ip}`
  const current = await redis.incr(key)
  
  if (current === 1) {
    // First request in window — set expiry
    await redis.expire(key, 3600) // 1 hour
  }
  
  // Allow 20 requests per hour per IP
  return current <= 20
}

export async function GET(req: NextRequest) {
  const ip = req.ip || 'unknown'
  
  if (!(await rateLimit(ip))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in 1 hour.' },
      { status: 429 }
    )
  }

  // ... rest of handler
}
```

---

## Issue #6: No Input Validation

**File:** `src/lib/piped.ts` and `src/components/Playlist.tsx`

**Problem:**

YouTube URL parsing is basic and doesn't validate user input:

```typescript
export function extractVideoId(youtubeUrl: string): string | null {
  const shortMatch = youtubeUrl.match(/youtu\.be\/([^?&/]+)/)
  if (shortMatch) return shortMatch[1]
  // ... more regex
}
```

What if user pastes:
- Empty string
- `javascript:alert('xss')`
- Very long string (DOS)
- Invalid URL

**Fix:**

```typescript
export function extractVideoId(youtubeUrl: string): string | null {
  if (!youtubeUrl || youtubeUrl.length > 2048) {
    throw new Error('Invalid URL length')
  }

  try {
    new URL(youtubeUrl)  // Validate it's a URL
  } catch {
    throw new Error('Invalid URL format')
  }

  const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (!videoIdMatch) {
    throw new Error('Could not extract YouTube video ID')
  }

  return videoIdMatch[1]
}
```

---

## Issue #7: Unused Duration Parsing

**File:** `src/lib/piped.ts`

**Problem:**

```typescript
/** @deprecated kept for backward compat with old JSONB data that has duration as "MM:SS" string */
export { formatDuration }
```

This function is exported but not imported anywhere. If there's no old data, it can be removed.

**Fix:**

Check if any queries return duration as string:

```bash
# In Supabase console:
SELECT DISTINCT typeof(playlist) FROM groups WHERE playlist IS NOT NULL LIMIT 5
```

If all are numbers, delete `formatDuration` function entirely.

---

## Issue #8: Member Colors Not Guaranteed Unique

**File:** `src/hooks/useMembers.ts`

**Problem:**

Member colors are randomly assigned but could collide (especially with many members):

```typescript
const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', ...] // 8 colors
const randomColor = colors[Math.floor(Math.random() * colors.length)]
```

With 10 members, ~50% chance of collision.

**Fix:**

Use a hash of the member name:

```typescript
function getMemberColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash = hash & hash  // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length]
}
```

---

## Issue #9: No Mobile Viewport Optimization

**File:** `src/app/layout.tsx`

**Problem:**

Missing viewport metadata for mobile:

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**Fix:**

Add metadata:

```typescript
export const metadata: Metadata = {
  title: 'Office Jukebox',
  description: 'Collaborative music for your office',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    startupImage: '/icon-192.png',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-180.png',
  },
}
```

---

## Issue #10: No Service Worker / PWA Support

**File:** None (missing)

**Problem:**

App doesn't work offline. When user loses internet, music stops and UI breaks.

**Solution (P2 priority):**

1. Create `public/service-worker.js`
2. Register in `src/app/layout.tsx`
3. Cache playlist + player UI
4. Handle offline playback resumption

This is a larger effort (~8 hours) but unlocks:
- Offline mode
- Better background playback
- "Add to Home Screen" on iOS

---

## Summary of Quick Fixes

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Remove unused `_containerId` | P0 | 5 min | Clean up code |
| Add error boundaries | P1 | 1 hr | Prevent crashes |
| Add Supabase reconnect logic | P1 | 1 hr | Better reliability |
| Optimistic UI updates | P1 | 1 hr | Better UX |
| Rate limiting | P1 | 30 min | Protect API quota |
| Input validation | P1 | 30 min | Security |
| Member color hashing | P2 | 15 min | Nice to have |
| Viewport metadata | P2 | 15 min | Mobile UX |
| Service worker / PWA | P3 | 8 hrs | Offline support |

---

## Recommended Implementation Order

1. **CRITICAL:** YouTube IFrame → Piped migration (6-8 hrs)
2. **HIGH:** Error boundaries (1 hr)
3. **HIGH:** Supabase reconnect logic (1 hr)
4. **MEDIUM:** Optimistic UI updates (1 hr)
5. **MEDIUM:** Rate limiting (30 min)
6. **MEDIUM:** Input validation (30 min)
7. **LOW:** Member color hashing (15 min)
8. **LOW:** Viewport metadata (15 min)
9. **FUTURE:** Service worker / PWA (8 hrs, P3)

**Total P0-P1 Work:** ~11 hours  
**Total P2 Work:** ~30 minutes  
**Total P3 Work:** ~8 hours (future)

---

## Testing Coverage Needed

Currently no tests. Recommended additions:

```typescript
// usePlayer.ts tests
- Audio element src updates on group change
- Progress updates every 500ms
- Skip next/prev updates current_index
- Media Session handlers work
- Wake Lock is requested when playing

// Playlist.tsx tests
- Can add song via URL
- Can remove song
- Can drag-drop reorder
- Optimistic UI works
- Error toast on failure

// Integration tests
- Join room → members appear
- Add song on device A → appears on device B
- Pause on device A → paused on device B
```

Recommend: **Jest + React Testing Library** (~20 hrs to implement full coverage)

---

**Last Updated:** March 2, 2026

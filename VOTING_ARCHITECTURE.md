# Voting System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Playlist.tsx                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Song #1: "Never Gonna Give You Up"                     │  │  │
│  │  │  ┌──────┐ ┌──────┐ ┌─────┐                              │  │  │
│  │  │  │ 👍 5 │ │ 👎 2 │ │ ❌  │                             │  │  │
│  │  │  └──────┘ └──────┘ └─────┘                              │  │  │
│  │  │                                                            │  │  │
│  │  │  Song #2: "Bohemian Rhapsody"                             │  │  │
│  │  │  ┌──────┐ ┌──────┐ ┌─────┐ ⚠️  ← Warning: 1 more vote   │  │  │
│  │  │  │ 👍 1 │ │ 👎 2 │ │ ❌  │     will remove (3 members)   │  │  │
│  │  │  └──────┘ └──────┘ └─────┘                              │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
│                                 │ onClick                            │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              useVoting Hook (hooks/useVoting.ts)               │  │
│  │                                                                  │  │
│  │  upvoteMutation()                                               │  │
│  │  ├─ Toggle user's upvote                                        │  │
│  │  ├─ Remove from downvotes if present                            │  │
│  │  └─ Update Supabase                                             │  │
│  │                                                                  │  │
│  │  downvoteMutation()                                             │  │
│  │  ├─ Toggle user's downvote                                      │  │
│  │  ├─ Remove from upvotes if present                              │  │
│  │  ├─ Check if majority reached:                                  │  │
│  │  │    if (downvotes > totalMembers / 2)                         │  │
│  │  │      → Remove song from playlist                             │  │
│  │  │      → Adjust current_index if needed                        │  │
│  │  └─ Update Supabase                                             │  │
│  │                                                                  │  │
│  │  getVoteStatus(song)                                            │  │
│  │  └─ Returns: { upvoteCount, downvoteCount, hasUpvoted,          │  │
│  │               hasDownvoted, willBeRemoved }                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Supabase Database                             │  │
│  │                                                                  │  │
│  │  groups table:                                                   │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │ id: "abc-123"                                            │   │  │
│  │  │ name: "Office Party"                                     │   │  │
│  │  │ playlist: [                                              │   │  │
│  │  │   {                                                       │   │  │
│  │  │     id: "song-1",                                        │   │  │
│  │  │     title: "Never Gonna Give You Up",                   │   │  │
│  │  │     upvotes: ["Alice", "Bob", "Charlie", "Dave", "Eve"],│   │  │
│  │  │     downvotes: ["Frank", "Grace"]                       │   │  │
│  │  │   },                                                      │   │  │
│  │  │   {                                                       │   │  │
│  │  │     id: "song-2",                                        │   │  │
│  │  │     title: "Bohemian Rhapsody",                         │   │  │
│  │  │     upvotes: ["Alice"],                                 │   │  │
│  │  │     downvotes: ["Bob", "Charlie"]  ← 2/3 = 66% 🔴      │   │  │
│  │  │   }                                                       │   │  │
│  │  │ ]                                                         │   │  │
│  │  │ current_index: 0                                         │   │  │
│  │  │ is_playing: true                                         │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
│                                 │ Realtime Broadcast                 │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Supabase Realtime (WebSocket)                       │  │
│  │                                                                  │  │
│  │  Channel: "groups:abc-123"                                      │  │
│  │  ├─ Postgres Changes (watches groups table)                     │  │
│  │  └─ Broadcasts update to all connected clients                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PLAYBACK LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            usePlayer Hook (hooks/usePlayer.ts)                 │  │
│  │                                                                  │  │
│  │  useEffect(() => {                                              │  │
│  │    // Monitor current song votes every render                   │  │
│  │    const currentSong = playlist[current_index]                  │  │
│  │                                                                  │  │
│  │    if (shouldAutoSkip(currentSong, totalMembers)) {             │  │
│  │      // Remove song from playlist                               │  │
│  │      const newPlaylist = playlist.filter(...)                   │  │
│  │                                                                  │  │
│  │      // Advance to next song                                    │  │
│  │      supabase.from('groups').update({                           │  │
│  │        playlist: newPlaylist,                                   │  │
│  │        current_index: adjustedIndex,                            │  │
│  │        playback_started_at: new Date().toISOString()            │  │
│  │      })                                                          │  │
│  │    }                                                             │  │
│  │  }, [playlist, current_index, totalMembers])                    │  │
│  │                                                                  │  │
│  │  shouldAutoSkip(song, totalMembers) {                           │  │
│  │    return song.downvotes.length > (totalMembers / 2)            │  │
│  │  }                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              HTML5 Audio Element                               │  │
│  │                                                                  │  │
│  │  <audio src="https://stream.url/audio.mp3" />                  │  │
│  │                                                                  │  │
│  │  ✅ Background playback on mobile                              │  │
│  │  ✅ Auto-skip on song end                                      │  │
│  │  ✅ Media Session API for lock screen controls                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    VOTE FLOW SEQUENCE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: User clicks 👎 on Song #2                                  │
│  ────────────────────────────────────────                            │
│  Alice (Tab 1)  │  Bob (Tab 2)  │  Charlie (Tab 3)                  │
│        │                │                 │                          │
│        │ Click 👎       │                 │                          │
│        ▼                │                 │                          │
│  downvoteMutation()     │                 │                          │
│        │                │                 │                          │
│        ├─ downvotes: ["Alice"]           │                          │
│        ├─ Check: 1 > 1.5? ❌ (33%)       │                          │
│        ▼                │                 │                          │
│  Update Supabase        │                 │                          │
│        │                │                 │                          │
│        ├───────────────────────────────────► Realtime Broadcast     │
│        │                │                 │                          │
│        ▼                ▼                 ▼                          │
│  UI updates in all tabs (👎 count = 1)                              │
│                                                                       │
│                                                                       │
│  Step 2: Bob clicks 👎 on same song                                 │
│  ───────────────────────────────────────                             │
│  Alice (Tab 1)  │  Bob (Tab 2)  │  Charlie (Tab 3)                  │
│        │                │                 │                          │
│        │         Click 👎                 │                          │
│        │                ▼                 │                          │
│        │         downvoteMutation()       │                          │
│        │                │                 │                          │
│        │                ├─ downvotes: ["Alice", "Bob"]               │
│        │                ├─ Check: 2 > 1.5? ✅ (67% - MAJORITY!)      │
│        │                ├─ 🚨 REMOVE SONG FROM PLAYLIST              │
│        │                ▼                 │                          │
│        │         Update Supabase          │                          │
│        │                │                 │                          │
│        │                ├───────────────────────────► Realtime       │
│        │                │                 │                          │
│        ▼                ▼                 ▼                          │
│  🎉 Song #2 removed from all devices                                │
│  🔔 Toast: "Bohemian Rhapsody removed (majority downvoted)"         │
│                                                                       │
│                                                                       │
│  Step 3: If Song #2 was currently playing...                        │
│  ────────────────────────────────────────────                        │
│  usePlayer.ts detects change                                         │
│        │                                                              │
│        ├─ Current song removed from playlist                         │
│        ├─ Load next song (Song #3)                                  │
│        ├─ audio.src = nextSong.piped_url                            │
│        ├─ audio.currentTime = 0                                     │
│        └─ audio.play()                                               │
│                                                                       │
│  ✅ Seamless auto-skip to next song                                 │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    DATA STRUCTURE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Song Type (TypeScript):                                             │
│  ───────────────────────                                             │
│  interface Song {                                                    │
│    id: string                  // Unique identifier                 │
│    title: string               // "Never Gonna Give You Up"         │
│    video_id: string            // "dQw4w9WgXcQ"                     │
│    thumbnail: string           // URL to artwork                    │
│    duration: number            // 213 (seconds)                     │
│    votes: number               // DEPRECATED (kept for compat)      │
│    order: number               // Position in playlist              │
│    piped_url: string           // Audio stream URL                  │
│    piped_url_expires?: number  // Unix timestamp                    │
│    upvotes: string[]           // ["Alice", "Bob", "Charlie"]       │
│    downvotes: string[]         // ["Dave", "Eve"]                   │
│  }                                                                   │
│                                                                       │
│  Why arrays instead of counts?                                       │
│  ────────────────────────────                                        │
│  ✅ Prevents duplicate votes (check if name exists)                 │
│  ✅ Allows vote toggling (remove from array)                        │
│  ✅ Enables future features (show who voted)                        │
│  ✅ No race conditions (Supabase handles atomic updates)            │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                  MAJORITY CALCULATION                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Algorithm: downvoteCount > (totalMembers / 2)                       │
│  ─────────────────────────────────────────────                       │
│                                                                       │
│  ┌─────────────┬──────────┬──────────┬─────────┬─────────┐          │
│  │ Total       │ Threshold│ Remove   │ Keep    │ Notes   │          │
│  │ Members     │ (>50%)   │ At       │ At      │         │          │
│  ├─────────────┼──────────┼──────────┼─────────┼─────────┤          │
│  │ 1           │ > 0.5    │ 1+ votes │ 0 votes │ Solo    │          │
│  │ 2           │ > 1.0    │ 2 votes  │ 0-1     │ Both    │          │
│  │ 3           │ > 1.5    │ 2+ votes │ 0-1     │ 67%     │          │
│  │ 4           │ > 2.0    │ 3+ votes │ 0-2     │ 75%     │          │
│  │ 5           │ > 2.5    │ 3+ votes │ 0-2     │ 60%     │          │
│  │ 6           │ > 3.0    │ 4+ votes │ 0-3     │ 67%     │          │
│  │ 10          │ > 5.0    │ 6+ votes │ 0-5     │ 60%     │          │
│  │ 100         │ > 50.0   │ 51+ votes│ 0-50    │ 51%     │          │
│  └─────────────┴──────────┴──────────┴─────────┴─────────┘          │
│                                                                       │
│  Why strict majority (>) instead of (≥)?                             │
│  ───────────────────────────────────────                             │
│  With 4 members and ≥ rule:                                          │
│    2 downvotes = 50% → Would remove (unfair tie)                    │
│                                                                       │
│  With 4 members and > rule:                                          │
│    2 downvotes = 50% → Keep (requires clear consensus)              │
│    3 downvotes = 75% → Remove ✅                                    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Key Architecture Decisions

### 1. **Store Voter Names, Not Counts**
- Prevents duplicate votes
- Enables vote toggling
- Future-proof for features like "show who voted"

### 2. **Real-time Monitoring in usePlayer**
- Detects when current song crosses threshold
- Auto-skip happens in same render cycle
- No user action required

### 3. **Strict Majority (>50%)**
- Prevents ties from removing songs
- Requires clear consensus
- Fair for all group sizes

### 4. **Replace Entire Playlist Array**
- Supabase JSONB requires full replacement
- Simplifies logic (no SQL array manipulation)
- React Query handles optimistic updates

### 5. **Backwards Compatible**
- Old songs without vote arrays still work
- Gracefully initializes empty arrays
- No database migration required

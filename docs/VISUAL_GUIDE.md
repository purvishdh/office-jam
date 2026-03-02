# 📊 Office Jukebox — Visual Reference Guide

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER DEVICES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   iPhone     │  │   Android    │  │   Desktop    │          │
│  │              │  │              │  │              │          │
│  │ React App    │  │ React App    │  │ React App    │          │
│  │ + Player     │  │ + Player     │  │ + Player     │          │
│  │              │  │              │  │              │          │
│  │ <audio>      │  │ <audio>      │  │ <audio>      │          │
│  │ Piped URL    │  │ Piped URL    │  │ Piped URL    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│        │                 │                  │                   │
│        └─────────────────┼──────────────────┘                   │
│                          │                                       │
│                    WebSocket (Realtime)                         │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PostgreSQL Database                                           │
│  ├─ groups                                                      │
│  │  ├─ id, name, created_at                                    │
│  │  ├─ playlist (JSONB array)                                  │
│  │  ├─ current_index, is_playing                               │
│  │  └─ playback_started_at                                     │
│  │                                                              │
│  Realtime Subscriptions                                        │
│  ├─ postgres_changes → Group data updates                      │
│  └─ presence channel → Member list updates                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
        ┌────────┐    ┌────────┐    ┌─────────┐
        │YouTube │    │ Piped  │    │Server   │
        │ API v3 │    │ API    │    │  Logs   │
        │        │    │        │    │         │
        │Metadata│    │Streams │    │Errors   │
        │        │    │URLs    │    │         │
        └────────┘    └────────┘    └─────────┘
```

---

## Data Flow: Adding a Song

```
┌──────────────────────┐
│  User enters URL     │
│ youtube.com/v=abc123 │
└──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  Playlist Component                          │
│  ├─ Extract video ID: "abc123"               │
│  └─ Call fetchSong()                         │
└──────────────────────────────────────────────┘
           │
           ├─────────────────┬─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  /api/song   │  │/api/stream   │  │Supabase DB   │
    │  YouTube API │  │  Piped API   │  │              │
    │              │  │              │  │              │
    │ Returns:     │  │ Returns:     │  │ Store Song:  │
    │ ├ title      │  │ ├ url        │  │ ├ id         │
    │ ├ thumbnail  │  │ └ expires    │  │ ├ title      │
    │ ├ duration   │  │              │  │ ├ piped_url  │
    │ └ video_id   │  │              │  │ ├ thumbnail  │
    └──────────────┘  └──────────────┘  │ └ duration   │
           │                 │           │              │
           └─────────────────┴───────────┤ (merged)     │
                                         │              │
                                  ┌──────┴──────┐       │
                                  │ Song Object │       │
                                  │             │       │
                                  │ {           │       │
                                  │   id: ...,  │       │
                                  │   title: ..,│       │
                                  │   piped_url │       │
                                  │   : "https:."       │
                                  │ }           │       │
                                  └──────┬──────┘       │
                                         │              │
                                         ▼              ▼
                                  ┌────────────────────┐
                                  │ Update Supabase    │
                                  │ playlist array     │
                                  └────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
            Device A (iPhone)  Device B (Android)  Device C (Desktop)
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                             Supabase Realtime
                          postgres_changes event
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
              Update UI        Update UI           Update UI
              Add song to       Add song to         Add song to
              Playlist          Playlist            Playlist
              All users see the same songs ✓
```

---

## Data Flow: Playback & Sync

```
Step 1: User taps PLAY
┌─────────────┐
│ Play Button │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│ usePlayer Hook                       │
│ ├─ togglePlay()                      │
│ └─ Update Supabase:                  │
│    ├─ is_playing = true              │
│    └─ playback_started_at = now()    │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Supabase postgres_changes            │
│ broadcasts to all clients            │
└──────────────────────────────────────┘
       │
       ├─ Device A ─────────────┐
       │                        ▼
       │              ┌──────────────────┐
       │              │ useGroup hook    │
       │              │ (already subscr) │
       │              │ Updates cache    │
       │              └────────┬─────────┘
       │                       │
       │                       ▼
       │              ┌──────────────────┐
       │              │ Group component  │
       │              │ Re-renders with  │
       │              │ new group data   │
       │              └────────┬─────────┘
       │                       │
       │                       ▼
       │              ┌──────────────────┐
       │              │ usePlayer effect │
       │              │ Detects change:  │
       │              │ is_playing=true  │
       │              └────────┬─────────┘
       │                       │
       │                       ▼
       │              ┌──────────────────┐
       │              │ <audio>.play()   │
       │              │ Piped stream URL │
       │              └────────┬─────────┘
       │                       │
       │                       ▼
       │              🔊 Music Playing
       │
       ├─ Device B (same flow)
       └─ Device C (same flow)

All devices in sync ✓
```

---

## Current Issue: YouTube IFrame (Broken on Mobile)

```
┌──────────────────────────────────────────────────────────┐
│               CURRENT CODE (BROKEN)                      │
└──────────────────────────────────────────────────────────┘

   Player Component
   │
   ├─ Hidden div id="yt-player-container"
   │  └─ YouTube IFrame API loaded here
   │
   └─ usePlayer hook
      └─ YT.Player plays video

Desktop: Works fine
   │
   └─ User clicks play
      └─ YT.Player loads video
         └─ Audio plays ✓

Mobile with locked screen: FAILS
   │
   └─ User clicks play, audio starts
   │
   ├─ User locks screen
   │  └─ Browser suspends JavaScript
   │     └─ IFrame's JS context frozen
   │        └─ YT.Player stops ✗
   │
   └─ User unlocks screen
      └─ Audio is already stopped ✗
         No way to recover ✗

Why?
═══════════════════════════════════════════════════════════
Mobile browsers auto-pause JavaScript when:
• Screen is locked
• App is backgrounded
• App is minimized
• Device goes to sleep

The YT.Player is INSIDE an iframe, so when the JS
context suspends, the iframe's code also stops.

Solution?
═══════════════════════════════════════════════════════════
Use native <audio> element instead of iframe.
Browsers keep <audio> playing even when JS is suspended!
```

---

## Solution: Piped API + HTML5 Audio (Fixed on Mobile)

```
┌──────────────────────────────────────────────────────────┐
│           FIXED CODE (WORKING ON MOBILE)                │
└──────────────────────────────────────────────────────────┘

   Player Component
   │
   ├─ NO hidden iframe
   │
   └─ usePlayer hook
      │
      └─ Create <audio> element
         └─ Set src = piped_url
            └─ audio.play()

Desktop: Works fine
   │
   └─ User clicks play
      └─ <audio> element plays stream ✓

Mobile with locked screen: WORKS ✓
   │
   ├─ User clicks play
   │  └─ audio.play()
   │     └─ Piped stream starts ✓
   │
   ├─ User locks screen
   │  └─ Browser suspends JavaScript
   │     └─ BUT <audio> keeps playing! ✓
   │        (Audio playback continues in OS-level context)
   │
   └─ User unlocks screen
      └─ Audio still playing ✓
         Lock screen shows controls ✓

Why?
═════════════════════════════════════════════════════════════
HTML5 <audio> elements have special handling:
• Audio continues even if JS is suspended
• Browsers handle it at OS level
• Lock screen can show player controls
• Wake Lock API can keep screen on

What is Piped?
═════════════════════════════════════════════════════════════
Piped = Privacy-focused YouTube alternative
It extracts the audio stream URL directly
Example: youtube.com/watch?v=abc123
         ↓
         piped-api.kavin.rocks/streams/abc123
         ↓
         {
           audioStreams: [
             {
               url: "https://c.piped.io/...", ← PLAYABLE!
               mimeType: "audio/mp4",
               quality: "128k"
             }
           ]
         }

This URL can be set directly on <audio src="">
```

---

## Fix Timeline

```
┌─────────────────────────────────────────────────────────┐
│ CRITICAL FIX: YouTube IFrame → Piped API                │
│ Time: 6.5 hours total                                   │
└─────────────────────────────────────────────────────────┘

Day 1: Preparation & Backend (2.5 hours)
├─ Step 1: Create /api/stream route (30 min)
│          └─ Piped proxy endpoint
├─ Step 2: Update Song type (10 min)
│          └─ Add piped_url field
├─ Step 3: Update fetchSong() (30 min)
│          └─ Fetch stream URL
└─ Step 4: Test on desktop (1 hour)
           └─ Verify everything loads

Day 2: Frontend & Testing (4 hours)
├─ Step 5: Update usePlayer hook (1.5 hours)
│          └─ Error handler + wake lock
├─ Step 6: Remove YouTube iframe (30 min)
│          └─ Clean up Player component
├─ Step 7: Delete YouTube types (10 min)
│          └─ src/types/youtube.d.ts
└─ Testing on mobile (2 hours)
   ├─ iPhone with screen locked ✓
   ├─ Android with screen locked ✓
   └─ Lock screen controls ✓

Result: MVP Ready! 🚀
```

---

## Development Workflow

```
┌──────────────────────────────────────────────────┐
│  You want to add a feature / fix a bug           │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ 1. Read the relevant documentation               │
│    └─ APP_ARCHITECTURE.md: How system works      │
│    └─ CRITICAL_ISSUES.md: Blocking bugs         │
│    └─ CODE_REVIEW.md: Quality issues            │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ 2. Create feature branch                         │
│    git checkout -b feat/my-feature               │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ 3. Make changes (follow the detailed guides)     │
│    npm run dev                                   │
│    Test locally                                  │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ 4. Lint & commit                                 │
│    npm run lint                                  │
│    git commit -m "feat: ..."                     │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ 5. Test on mobile if UI change                   │
│    http://[your-ip]:3000                         │
│    Try on iPhone & Android                       │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ 6. Push & create PR                              │
│    git push origin feat/my-feature               │
│    github.com/... → Create PR                    │
└──────────────────────────────────────────────────┘
           │
           ▼
      ✓ Done!
```

---

## File Dependency Map

```
src/components/Player.tsx
├─ uses: src/hooks/usePlayer.ts
│       └─ uses: src/lib/supabase.ts
│       └─ uses: src/lib/types.ts
├─ uses: src/lib/types.ts
└─ renders: <audio> element + UI controls

src/components/Playlist.tsx
├─ uses: src/lib/piped.ts
│       └─ calls: /api/song
│       └─ calls: /api/stream
├─ uses: src/lib/supabase.ts
└─ handles: mutation, voting, drag-drop

src/hooks/usePlayer.ts
├─ creates: <audio> element
├─ subscribes: to group changes (via useGroup)
├─ uses: Media Session API
├─ uses: Wake Lock API
└─ manages: playback state, progress, seeking

src/hooks/useGroup.ts
├─ fetches: initial group data
├─ subscribes: to Supabase Realtime
└─ manages: React Query cache

src/lib/piped.ts
├─ parses: YouTube URLs
├─ calls: /api/song (YouTube metadata)
├─ calls: /api/stream (audio stream)
└─ builds: Song objects

/api/song
├─ calls: YouTube Data API v3
└─ returns: {title, thumbnail, duration, video_id}

/api/stream ← CREATE THIS
├─ calls: Piped API (pipedapi.kavin.rocks)
└─ returns: {url, expires}

src/types/youtube.d.ts ← DELETE THIS
```

---

## Success Metrics

```
Before Fix (Current):
├─ ✓ Desktop playback works
├─ ✗ Mobile with locked screen: FAILS
├─ ✗ Mobile background playback: FAILS
├─ ✗ Multiple device sync: Works for desktop
└─ ✗ MVP: BLOCKED

After Fix:
├─ ✓ Desktop playback works
├─ ✓ Mobile with locked screen: WORKS
├─ ✓ Mobile background playback: WORKS
├─ ✓ Multiple device sync: Works for all devices
└─ ✓ MVP: READY
```

---

**Visual Guide Last Updated:** March 2, 2026  
**For detailed info:** See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

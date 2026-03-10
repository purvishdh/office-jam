# 🚀 Quick Start: Top 3 Features Implementation Guide

## Feature 1: Mood-Based Playlists (1 day) ⭐⭐⭐

### What Users See
```
[Home Page]
┌─────────────────────────────────┐
│  🎵 Office Jukebox              │
│                                 │
│  [Your Name ▼]                  │
│                                 │
│  ┌─ Quick Start ─────────────┐ │
│  │ 🎵 Coding Session        │ │
│  │ 🎵 Dance Floor           │ │
│  │ 🎵 Chill Vibes           │ │
│  │ 🎵 Workout               │ │
│  │ 🎵 Focus                 │ │
│  │ 🎵 Party Hits            │ │
│  └──────────────────────────┘ │
│                                 │
│  [Or Start Your Own Party]      │
│                                 │
└─────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Add Template Data
**File:** `src/lib/playlists.ts` (NEW)

```typescript
export interface QuickPlaylist {
  id: string
  name: string
  emoji: string
  description: string
  songs: Array<{
    title: string
    video_id: string
  }>
}

export const QUICK_PLAYLISTS: QuickPlaylist[] = [
  {
    id: 'coding',
    name: 'Coding Session',
    emoji: '🎵',
    description: 'Focus music for work',
    songs: [
      { title: 'Blinding Lights - The Weeknd', video_id: 'ZRLk1AVwYaA' },
      { title: 'Midnight City - M83', video_id: 'gy1B3agGNxw' },
      { title: 'Synthwave 80s', video_id: 'x8VYWazR5ck' },
      { title: 'Night Owl - Galimatias feat. Alexa Tetra', video_id: 'B68Yiag7W3w' },
      { title: 'Neon Dreams - John Carpenter', video_id: 'moSFlvxnbgk' },
      { title: 'Retrowave Dreams', video_id: 'oUDwYp60tBo' },
      { title: 'Carpenter Brut - Trilogy', video_id: '1yRQdR6pqZ4' },
      { title: 'Robert Parker - Gunship', video_id: 'aXnrHPp93W4' },
      { title: 'Perturbator - Sentient', video_id: 'hh_YUTv0VRE' },
      { title: 'The Perfect Girl - Nine Inch Nails', video_id: 'OUJPc2u3Ql8' },
    ]
  },
  {
    id: 'dance',
    name: 'Dance Floor',
    emoji: '🕺',
    description: 'Get everyone moving',
    songs: [
      { title: 'Levitating - Dua Lipa', video_id: 'TUVcZfQe-Kw' },
      // ... add 9 more party tracks
    ]
  },
  {
    id: 'chill',
    name: 'Chill Vibes',
    emoji: '😌',
    description: 'Relax and unwind',
    songs: [
      { title: 'Skinny Love - Bon Iver', video_id: 'D5qrlIi1bwA' },
      // ... add 9 more chill tracks
    ]
  },
  {
    id: 'workout',
    name: 'Workout',
    emoji: '💪',
    description: 'High energy pump up music',
    songs: [
      { title: 'Believer - Imagine Dragons', video_id: '7wtfhZwyrcc' },
      // ... add 9 more workout tracks
    ]
  },
  {
    id: 'focus',
    name: 'Focus',
    emoji: '🧠',
    description: 'Instrumental focus music',
    songs: [
      { title: 'Weightless - Marconi Union', video_id: 'jG7zyCDw9N0' },
      // ... add 9 more focus tracks
    ]
  },
  {
    id: 'party',
    name: 'Party Hits',
    emoji: '🎉',
    description: 'All-time party bangers',
    songs: [
      { title: 'Shut Up and Dance - WALK THE MOON', video_id: 'j44U6hnMV2E' },
      // ... add 9 more party tracks
    ]
  },
]
```

#### Step 2: Create UI Component
**File:** `src/components/QuickPlaylists.tsx` (NEW)

```typescript
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QUICK_PLAYLISTS } from '@/lib/playlists'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface Props {
  userName: string
}

export default function QuickPlaylists({ userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleQuickStart = async (playlistId: string) => {
    setLoading(true)
    const playlist = QUICK_PLAYLISTS.find(p => p.id === playlistId)
    if (!playlist) return

    try {
      // Create group with playlist
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: `${userName}'s ${playlist.name}`,
          playlist: playlist.songs.map((song, i) => ({
            id: `${Date.now()}-${i}`,
            title: song.title,
            video_id: song.video_id,
            piped_url: '',
            piped_url_expires: undefined,
            thumbnail: `https://img.youtube.com/vi/${song.video_id}/mqdefault.jpg`,
            duration: 0,
            votes: 0,
            order: i,
          })),
          current_index: 0,
          is_playing: false,
        })
        .select('id')
        .single()

      if (error) throw error
      
      toast.success(`${playlist.name} playlist created! 🎉`)
      router.push(`/group/${data.id}`)
    } catch (err) {
      toast.error('Failed to create playlist')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold mb-6 text-center">Quick Start</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_PLAYLISTS.map(playlist => (
            <button
              key={playlist.id}
              onClick={() => handleQuickStart(playlist.id)}
              disabled={loading}
              className="relative group bg-surface-300 hover:bg-surface-400 border border-surface-400 rounded-xl p-4 transition-all duration-300 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-brand-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="text-3xl">{playlist.emoji}</span>
                <span className="text-sm font-semibold text-center">{playlist.name}</span>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-white/60 mb-4">or</p>
        <button className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl font-semibold transition-all">
          Start Your Own Party
        </button>
      </div>
    </div>
  )
}
```

#### Step 3: Update HomePage
**File:** `src/app/page.tsx` - Add QuickPlaylists component

```typescript
// Add to imports
import QuickPlaylists from '@/components/QuickPlaylists'

// In the return statement, after the name input:
{name && !creating && !groupId && (
  <QuickPlaylists userName={name} />
)}
```

---

## Feature 2: DJ Mode (2 days) ⭐⭐⭐

### What Changes

```
[DJ View]
┌─────────────────────────────────┐
│  👑 You're the DJ                │
│  Your decisions control playback │
├─────────────────────────────────┤
│  [Play] [Skip] [Pause]          │ ← Only DJ sees these
│  Current: Song A                │
│  Next: Song B (can reorder)    │
└─────────────────────────────────┘

[Member View]
┌─────────────────────────────────┐
│  ⏳ DJ is in control             │
│  Current: Song A                │
│  Next: Song B                    │
│  [Vote] [Add Song]              │ ← Members can do this
└─────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Update Database Schema
**File:** `MANUAL_MIGRATION.sql` (add to existing migrations)

```sql
-- Add DJ mode fields to groups table
ALTER TABLE groups ADD COLUMN dj_name TEXT;
ALTER TABLE groups ADD COLUMN dj_device_id TEXT;

-- dj_name = localStorage name when they created group
-- dj_device_id = browser fingerprint (uuid) to detect same device
```

#### Step 2: Create DJ Hook
**File:** `src/hooks/useDJMode.ts` (NEW)

```typescript
'use client'
import { useEffect, useState } from 'react'
import type { Group } from '@/lib/types'

export function useDJMode(group: Group | undefined, userName: string) {
  const [isDJ, setIsDJ] = useState(false)

  useEffect(() => {
    if (!group) return
    // Check if current user is the DJ
    // For now: use simple name matching (could add device ID later)
    const isUserDJ = group.dj_name === userName
    setIsDJ(isUserDJ)
  }, [group, userName])

  return {
    isDJ,
    djName: group?.dj_name,
  }
}
```

#### Step 3: Update Player Component
**File:** `src/components/Player.tsx`

```typescript
// Add near the top:
const { isDJ } = useDJMode(group, userName)

// Update control buttons:
{isDJ ? (
  <div className="flex gap-2">
    <button onClick={skipPrev} className="p-3 bg-brand-500 rounded-full">
      <SkipBack className="w-6 h-6" />
    </button>
    <button onClick={togglePlay} className="p-3 bg-brand-500 rounded-full">
      {isPlaying ? <Pause /> : <Play />}
    </button>
    <button onClick={skipNext} className="p-3 bg-brand-500 rounded-full">
      <SkipForward className="w-6 h-6" />
    </button>
  </div>
) : (
  <div className="text-center text-sm text-white/70">
    ⏳ DJ ({group?.dj_name}) is controlling playback
  </div>
)}

// Show DJ badge
{isDJ && (
  <div className="absolute top-3 right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
    👑 YOU'RE THE DJ
  </div>
)}
```

#### Step 4: Update Group Creation
**File:** `src/app/page.tsx`

```typescript
// When creating group, store DJ info:
const { data, error } = await supabase
  .from('groups')
  .insert({
    name: `${name.trim()}'s Party`,
    dj_name: name.trim(),  // ← Add this
    dj_device_id: getDeviceId(), // Optional: for more robust detection
  })
  .select('id')
  .single()
```

---

## Feature 3: Share Cards (1 day) ⭐⭐⭐

### What Users See

```
[Share Modal]
┌─────────────────────────────────────┐
│  Share This Party! 🎉              │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │  🎵 Alex's Party             │  │
│  │  👥 3 people vibing          │  │
│  │  🎵 Now: Blinding Lights     │  │
│  │                              │  │
│  │  ▯▯▯▯▯▯▯▯                    │  │
│  │  (QR Code)                   │  │
│  └──────────────────────────────┘  │
│                                    │
│  [📸 Screenshot]  [📋 Copy Link]   │
│  [🔗 Share to...]                  │
└─────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Create Share Component
**File:** `src/components/ShareCard.tsx` (NEW)

```typescript
'use client'
import { useRef, useState } from 'react'
import QRCode from 'qrcode.react'
import { Copy, Share2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import type { Group, Song } from '@/lib/types'

interface Props {
  group: Group
  currentSong: Song | undefined
}

export default function ShareCard({ group, currentSong }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const shareUrl = `${window.location.origin}/group/${group.id}`
  const memberCount = 1 // TODO: get from presence data

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied! 🎉')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleScreenshot = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1a1a',
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL()
      link.download = `${group.name}-party.png`
      link.click()
      toast.success('Downloaded! 📸')
    } catch {
      toast.error('Failed to screenshot')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: group.name,
          text: `Join our music party!`,
          url: shareUrl,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="space-y-4">
      {/* Card to Screenshot */}
      <div
        ref={cardRef}
        className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 text-center space-y-4 w-full max-w-sm mx-auto border-2 border-brand-400"
      >
        <div className="text-5xl">🎵</div>
        <h2 className="text-3xl font-bold text-white">{group.name}</h2>
        <p className="text-brand-100">👥 {memberCount} people vibing</p>
        {currentSong && (
          <p className="text-sm text-brand-100">
            🎵 Now: {currentSong.title.substring(0, 30)}...
          </p>
        )}
        
        <div className="flex justify-center my-6">
          <QRCode 
            value={shareUrl}
            size={150}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
          />
        </div>
        
        <p className="text-xs text-brand-100/80">
          Tap to join or scan QR code
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-surface-300 hover:bg-surface-400 rounded-lg transition-all"
        >
          <Copy className="w-4 h-4" />
          Copy Link
        </button>
        <button
          onClick={handleScreenshot}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-surface-300 hover:bg-surface-400 rounded-lg transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Screenshot
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg transition-all"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  )
}
```

#### Step 2: Add to GroupRoom
**File:** `src/app/group/[id]/GroupRoom.tsx`

```typescript
// Add import
import ShareCard from '@/components/ShareCard'

// Add to return JSX (as a modal or separate section):
<button 
  onClick={() => setShowShare(true)}
  className="flex items-center gap-2"
>
  <Share2 className="w-5 h-5" />
  Share Party
</button>

{showShare && (
  <Modal onClose={() => setShowShare(false)}>
    <ShareCard group={group} currentSong={currentSong} />
  </Modal>
)}
```

#### Step 3: Install html2canvas
```bash
npm install html2canvas
```

---

## Testing Checklist

### Feature 1: Mood Playlists
- [ ] Click each mood button
- [ ] Group created with correct playlist
- [ ] Redirects to group page with songs loaded
- [ ] All 10 songs visible in playlist
- [ ] Can play/pause/skip

### Feature 2: DJ Mode
- [ ] DJ sees play/pause/skip buttons
- [ ] Members see "DJ is in control" message
- [ ] DJ name is stored and retrieved
- [ ] Non-DJ user gets read-only controls

### Feature 3: Share Cards
- [ ] Card displays group name + member count
- [ ] QR code generates correctly
- [ ] Copy link works
- [ ] Screenshot downloads as PNG
- [ ] Share button opens native share dialog

---

## Next Steps

Once these 3 are done (~3 days):
1. **Song History** (1 day) - Show what was played before
2. **AI Recommendations** (3 days) - Suggest songs based on vibe
3. **Member Profiles** (1 day) - Gamify who added best songs

Total time to have an amazing app: **1 week**

Want me to start implementing any of these? 🚀

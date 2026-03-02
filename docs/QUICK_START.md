# 🚀 Quick Start for Developers

**5-minute orientation guide**

---

## What is this project?

A collaborative music player for teams (like Spotify but for offices).

## What's the problem?

Music stops on mobile phones when you lock the screen or switch apps. This is a **critical bug that blocks MVP release**.

## What's the solution?

Replace YouTube IFrame with Piped API (6.5 hours to fix).

## Where do I start?

### Option A: "Explain it to me simply" (5 min)
→ Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

### Option B: "Give me the implementation guide" (15 min to read, 6.5 hrs to code)
→ Read [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) and follow the 7-step checklist

### Option C: "Show me the entire system" (30 min)
→ Read [APP_ARCHITECTURE.md](APP_ARCHITECTURE.md)

### Option D: "What else needs fixing?" (20 min)
→ Read [CODE_REVIEW.md](CODE_REVIEW.md)

---

## One-Minute Architecture

```
User opens app on phone
    ↓
Joins music room
    ↓
Player component receives current song from Supabase
    ↓
Current code: Uses YouTube IFrame → BREAKS on background
New code:     Uses Piped API → Works perfectly
    ↓
Audio streams from piped-api.kavin.rocks
    ↓
HTML5 <audio> element plays it
    ↓
When phone is backgrounded, browser keeps audio playing ✓
```

## Files You'll Touch

| File | Action | Why |
|------|--------|-----|
| `src/app/api/stream/route.ts` | **CREATE** | Fetch audio stream URLs from Piped |
| `src/lib/types.ts` | **MODIFY** | Add `piped_url` field to Song |
| `src/lib/piped.ts` | **MODIFY** | Fetch stream URL when adding song |
| `src/hooks/usePlayer.ts` | **MODIFY** | Handle stream expiry + wake lock |
| `src/components/Player.tsx` | **MODIFY** | Remove YouTube iframe |
| `src/types/youtube.d.ts` | **DELETE** | No longer needed |

**Total changes:** ~150 lines of code

## Implementation Roadmap

```
Day 1:
  ✓ Create /api/stream route (30 min)
  ✓ Update Song type (10 min)
  ✓ Update fetchSong() (30 min)
  ✓ Test on desktop (1 hour)

Day 2:
  ✓ Update usePlayer hook (2 hours)
  ✓ Add error handling + wake lock (1 hour)
  ✓ Remove YouTube iframe (30 min)
  ✓ Test on iPhone + Android (2 hours)
  ✓ Done! ✓
```

## How to Test

```bash
# Desktop
npm run dev
# Add song, play/pause, check browser console for errors

# Mobile
# Connect phone to same network as laptop
# Visit: http://[your-laptop-ip]:3000
# Add song, play music, lock screen
# → Music should continue playing ✓
```

## Success Checklist

- [ ] Song plays on desktop ✓
- [ ] Song plays on iPhone with screen locked ✓
- [ ] Song plays on Android with screen locked ✓
- [ ] Lock screen controls work (play/pause/skip) ✓
- [ ] App doesn't crash ✓

Once all checked → MVP is ready 🎉

## Need Help?

| Question | Answer |
|----------|--------|
| Where do I find code examples? | [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) Steps 1-7 |
| How do I understand the system? | [APP_ARCHITECTURE.md](APP_ARCHITECTURE.md) |
| What other bugs exist? | [CODE_REVIEW.md](CODE_REVIEW.md) |
| How do I navigate docs? | [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) |

## Key Files Reference

```
src/
├─ app/
│  ├─ page.tsx              ← Homepage (create/join)
│  ├─ api/
│  │  ├─ song/route.ts      ← Fetch YouTube metadata
│  │  └─ stream/route.ts    ← CREATE: Fetch audio streams
│  └─ group/[id]/
│     └─ GroupRoom.tsx      ← Main player room
├─ components/
│  ├─ Player.tsx            ← MODIFY: Remove iframe
│  └─ Playlist.tsx          ← Song queue
└─ hooks/
   ├─ usePlayer.ts          ← MODIFY: Audio engine
   └─ useGroup.ts           ← Sync with Supabase
```

## Common Errors & Fixes

**"audio.error: MEDIA_ERR_NETWORK"**
→ Stream URL expired or Piped is down. See usePlayer error handler in CRITICAL_ISSUES.md Step 4.

**"audio.play() rejected - no user interaction"**
→ Normal for first load. User needs to tap play button first. This is handled automatically.

**"TypeError: Cannot read property 'piped_url'"**
→ You forgot to fetch stream URL in fetchSong(). See CRITICAL_ISSUES.md Step 3.

**"App crashes on Player component"**
→ Add error boundary. See CODE_REVIEW.md Issue #2.

## Speed Tips

- Use the **7-step checklist in CRITICAL_ISSUES.md** — don't rewrite
- Copy-paste code examples (they're tested)
- Test on real iPhone/Android (browser devtools won't show issues)
- Use `npm run dev` with Turbopack for fast recompile

## Time Estimates

| Task | Hours | Difficulty |
|------|-------|------------|
| Read docs | 0.5 | Easy |
| Implement Steps 1-3 | 1.0 | Easy |
| Implement Steps 4-6 | 3.0 | Medium |
| Implement Step 7 | 0.5 | Easy |
| Test on mobile | 2.0 | Medium |
| Fix bugs | 1.0 | Variable |
| **Total** | **8.0** | - |

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/piped-api-integration

# Make changes following CRITICAL_ISSUES.md steps

# Commit
git add .
git commit -m "fix: replace YouTube iframe with Piped API

- Add /api/stream endpoint (Piped proxy)
- Update Song type with piped_url
- Update usePlayer to handle stream expiry
- Add Wake Lock API for background playback
- Remove YouTube iframe dependency

Fixes #1: YouTube IFrame doesn't work on mobile"

# Push
git push origin feat/piped-api-integration

# Create PR, test, merge
```

## Deploy

```bash
npm run build   # Build for production
npm start       # Test locally
vercel          # Deploy to Vercel
```

---

## Next Actions

1. **Right now:** Read [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md) (15 min)
2. **Tomorrow:** Implement Steps 1-7 (6.5 hours)
3. **Day 3:** Test on mobile (2 hours)
4. **Day 4:** Deploy MVP 🚀

---

**Questions?** Check [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for full docs.

**Ready to code?** Go to [CRITICAL_ISSUES.md](CRITICAL_ISSUES.md).

# 📋 Office Jukebox — Documentation Index

Welcome! This folder contains comprehensive documentation for the Office Jukebox project. Here's what each document covers:

---

## 📄 Documents Overview

### 1. **APP_ARCHITECTURE.md** (Start here!)
**Length:** 10,000+ words | **Read Time:** 20-30 min  
**Best for:** Understanding the entire application

- ✅ Current system architecture with diagrams
- ✅ How the app works (complete user flow)
- ✅ Technology stack breakdown
- ✅ Project file structure
- ✅ Development workflow & setup
- ✅ Debugging tips

**Use when:** Onboarding new developers, understanding system design, or planning major changes

---

### 2. **CRITICAL_ISSUES.md** (Most Important!)
**Length:** 3,000+ words | **Read Time:** 10-15 min  
**Best for:** Fixing the YouTube IFrame bug (blocking MVP)

- 🔴 **Critical Issue #1:** YouTube IFrame doesn't work on mobile (BLOCKING)
- ✅ 7-step implementation guide to fix it (Piped API integration)
- ✅ Step-by-step code snippets for each file
- ✅ Testing checklist for mobile/desktop
- ✅ Success criteria for MVP
- ✅ Estimated timeline (6.5 hours)

**Use when:** Ready to implement the Piped API fix

---

### 3. **CODE_REVIEW.md** (Quality & Technical Debt)
**Length:** 4,000+ words | **Read Time:** 15-20 min  
**Best for:** Code quality, improvements, and smaller fixes

- ⚠️ 10 code issues identified (with severity levels)
- ✅ Detailed explanation of each issue
- ✅ Code examples and fixes for each
- ✅ Priority matrix (P0-P3)
- ✅ Time estimates for all fixes
- ✅ Testing recommendations

**Issues covered:**
1. Remove unused YouTube iframe parameter
2. Add error boundaries (prevent crashes)
3. Add Supabase reconnect logic
4. Optimistic UI updates for mutations
5. Rate limiting on YouTube API
6. Input validation for URLs
7. Member color collisions
8. Mobile viewport optimization
9. Missing service worker / PWA
10. Input sanitization

**Use when:** Improving code quality, after CRITICAL_ISSUES is resolved

---

### 4. **ROADMAP.md** (Outdated reference)
**Status:** ⚠️ Partially superseded by APP_ARCHITECTURE.md

This file contains the original roadmap with architecture decisions. Some information is accurate but may be outdated. Reference **APP_ARCHITECTURE.md** for current state.

---

## 🎯 Quick Start Paths

### Path A: "I need to understand the app quickly" (30 min)
1. Read **APP_ARCHITECTURE.md** → "System Overview" section (5 min)
2. Skim "How the App Works" section (10 min)
3. Check "Project Structure" (5 min)
4. Review "Tech Stack" table (5 min)
5. Done! Now you understand the system.

### Path B: "I need to fix the mobile audio bug" (2 days)
1. Read **CRITICAL_ISSUES.md** completely (15 min)
2. Implement Step 1-7 in the guided checklist (6.5 hours)
3. Test on iPhone & Android (2 hours)
4. Done! MVP is now ready.

### Path C: "I'm improving code quality" (1 week)
1. Read **CODE_REVIEW.md** completely (20 min)
2. Implement P1 issues (error boundaries, reconnect logic, optimistic updates)
3. Add tests for critical paths
4. Deploy to staging
5. Done! App is now more reliable.

### Path D: "I'm planning next features" (1 week)
1. Read **APP_ARCHITECTURE.md** → "Future Development Tasks" (10 min)
2. Read **CODE_REVIEW.md** → "Summary of Quick Fixes" (5 min)
3. Review CRITICAL_ISSUES to understand architectural constraints
4. Make a feature plan based on P1-P3 priorities
5. Done! Now you have a roadmap.

---

## 🔴 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Homepage** | ✅ Working | Create group, enter name, geolocation |
| **Group Room** | ✅ Working | Playlist UI, member list, QR code |
| **Playlist** | ✅ Working | Add songs (YouTube), drag-drop reorder, voting |
| **Player** | ⚠️ **BROKEN on mobile** | Uses YouTube IFrame (doesn't survive background suspension) |
| **Geolocation** | ✅ Working | Find nearby groups within 10km |
| **Realtime Sync** | ✅ Working | Supabase Realtime pushes updates to all clients |
| **Mobile Responsive** | ✅ Working | Looks good on phones (UI-wise) |
| **Mobile Audio** | 🔴 **BROKEN** | Audio stops when screen locks or app backgrounded |
| **Tests** | ❌ None | No unit or E2E tests yet |
| **Auth** | ❌ None | Anyone can join any group |
| **Service Worker** | ❌ None | No offline support |

**Blocker for MVP:** Audio doesn't work on mobile → Fix in **CRITICAL_ISSUES.md** Step 1-7

---

## 📚 How to Use These Docs

### Searching for something specific?

| Looking for... | Go to... |
|----------------|----------|
| How to set up locally? | APP_ARCHITECTURE.md → "Local Setup" |
| How does real-time sync work? | APP_ARCHITECTURE.md → "How the App Works" → "Playback & Sync" |
| How do I add a new API route? | APP_ARCHITECTURE.md → "Project Structure" |
| What's wrong with the app? | CRITICAL_ISSUES.md or CODE_REVIEW.md |
| How do I deploy? | APP_ARCHITECTURE.md → "Building & Deployment" |
| What features should I build next? | CRITICAL_ISSUES.md (Step 1 first!) + CODE_REVIEW.md (P1 issues) + APP_ARCHITECTURE.md (P2-P4 features) |

---

## 🛠️ Implementation Checklist

### Before MVP Release
- [ ] **CRITICAL:** Implement Piped API integration (CRITICAL_ISSUES.md Steps 1-7)
  - [ ] Create `/api/stream` route
  - [ ] Update Song type with `piped_url`
  - [ ] Update `fetchSong()` to fetch stream URL
  - [ ] Update `usePlayer` with error handling
  - [ ] Add Wake Lock API
  - [ ] Remove YouTube iframe div
  - [ ] Delete YouTube type definitions
- [ ] Test on iPhone with screen locked ✓
- [ ] Test on Android with screen locked ✓
- [ ] Test on desktop (Chrome, Firefox, Safari) ✓

### Quick Wins (After MVP, before beta)
- [ ] Implement error boundaries (CODE_REVIEW.md Issue #2)
- [ ] Add Supabase reconnect logic (CODE_REVIEW.md Issue #3)
- [ ] Implement optimistic UI updates (CODE_REVIEW.md Issue #4)
- [ ] Add rate limiting (CODE_REVIEW.md Issue #5)
- [ ] Add input validation (CODE_REVIEW.md Issue #6)

### Before Production
- [ ] Add error boundaries and logging
- [ ] Set up monitoring (Sentry)
- [ ] Implement Supabase RLS policies
- [ ] Add rate limiting to all API routes
- [ ] Test edge cases on slow networks
- [ ] Deploy to Vercel
- [ ] Set up CI/CD

---

## 📞 Key Contacts & Resources

### External APIs
- **YouTube Data API v3:** https://developers.google.com/youtube/v3
- **Piped API:** https://piped.io/ (mirrors available if primary is down)
- **Supabase Docs:** https://supabase.io/docs
- **Next.js 15:** https://nextjs.org/docs

### Stack Overflow
Search tags: `react`, `next.js`, `typescript`, `tailwind`, `supabase`

---

## 🚀 Success Criteria (MVP)

✅ **MVP Release Checklist:**
- [ ] Audio plays in background on iPhone (screen locked)
- [ ] Audio plays in background on Android (screen locked)
- [ ] Multiple users can join same group
- [ ] Lock screen controls (play/pause) sync across devices
- [ ] No crashes on error conditions
- [ ] Error messages shown to user
- [ ] QR code sharing works
- [ ] Geolocation discovery works

**Estimated Time to MVP:** 2 weeks (1 week for CRITICAL fix + 1 week for CODE_REVIEW P1 issues)

---

## 📝 Maintaining These Docs

When you make changes:

1. **Update APP_ARCHITECTURE.md** if:
   - Adding new pages/routes
   - Changing database schema
   - Modifying tech stack
   - Changing folder structure

2. **Update CRITICAL_ISSUES.md** if:
   - Implementing the Piped API fix
   - Finding blocking issues
   - Changing implementation approach

3. **Update CODE_REVIEW.md** if:
   - Fixing code issues
   - Identifying new issues
   - Updating time estimates
   - Changing priority levels

4. **Add a note** to this index if you add new documentation

---

## 💡 Tips for Developers

### Running Commands
```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# No tests yet (TODO)
npm test  # ← Not available
```

### Common Debug Scenarios

**"Music stops on my phone"**
→ This is the CRITICAL issue. Implement CRITICAL_ISSUES.md Steps 1-7.

**"The room isn't syncing"**
→ Check Supabase Realtime status. See CODE_REVIEW.md Issue #3 for reconnect logic.

**"Adding a song freezes the UI"**
→ See CODE_REVIEW.md Issue #4 for optimistic updates.

**"The player component crashes"**
→ See CODE_REVIEW.md Issue #2 for error boundaries.

---

## 🎓 Learning Resources

For developers new to this stack:

- **React Hooks:** https://react.dev/reference/react
- **Next.js App Router:** https://nextjs.org/docs/app
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Supabase Realtime:** https://supabase.io/docs/guides/realtime
- **React Query:** https://tanstack.com/query/latest

---

**Last Updated:** March 2, 2026  
**Maintained By:** AI Assistant (Claude Haiku 4.5)  
**Status:** 🟡 In Progress (Waiting for CRITICAL_ISSUES implementation)

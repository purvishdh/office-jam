# User Tour Guide Feature

## Overview
The app includes a guided tour powered by **driver.js** that walks new users through all features with glassmorphism-styled tooltips.

## Features

### 🎯 Tour Steps
1. **Welcome** - Introduction to Office Jukebox
2. **Group Name** - Explains the party room concept
3. **DJ Mode Toggle** - How DJ mode controls playback
4. **Playlist** - How to manage the collaborative playlist
5. **Add Songs** - Instructions for adding YouTube content
6. **Voting System** - Upvote/downvote functionality
7. **Now Playing** - Current song display and controls
8. **Playback Controls** - Play/pause/skip buttons
9. **Members List** - Live presence indicator
10. **QR Code** - How to share and invite others
11. **Completion** - Final message with help button info

### 🎨 Glassmorphism Design
The tour popovers match the app's design with:
- Semi-transparent dark background (`rgba(15, 23, 42, 0.85)`)
- 20px backdrop blur
- Gradient text titles (purple to pink)
- Smooth animations
- Border highlights with opacity
- Shadow effects for depth

### 🚀 Auto-Start Behavior
- Tour automatically starts **1.5 seconds** after first visit
- Uses `localStorage` key `jukebox-tour-completed` to track completion
- Won't show again after user completes or closes it

### 🔄 Manual Trigger
Users can replay the tour anytime by clicking the **Help (?)** button in the header (next to DJ Mode toggle).

## Implementation Files

### Core Hook
**`src/hooks/useAppTour.ts`**
- Manages tour lifecycle
- Configures all tour steps
- Handles auto-start logic
- Returns `startTour()` function for manual triggers

### Styling
**`src/app/tour-styles.css`**
- Custom CSS overrides for driver.js
- Glassmorphism effects
- Button styling (gradient, hover states)
- Mobile-responsive adjustments
- Animations

**`src/app/globals.css`**
- Imports driver.js base styles
- Imports custom tour styles

### Integration Points
**`src/app/group/[id]/GroupRoom.tsx`**
- Imports `useAppTour` hook
- Adds Help button to header
- Provides `data-tour` attributes to elements

**Component Data Attributes:**
- `[data-tour="group-name"]` - Header group info
- `[data-tour="dj-toggle"]` - DJ Mode button
- `[data-tour="playlist"]` - Playlist container
- `[data-tour="add-song"]` - Add song input area
- `[data-tour="voting"]` - Voting buttons (first song)
- `[data-tour="player"]` - Player component
- `[data-tour="player-controls"]` - Play/pause/skip buttons
- `[data-tour="members"]` - Members list
- `[data-tour="qr-code"]` - QR code component

## Customization

### Adding New Steps
Edit `src/hooks/useAppTour.ts`:

```typescript
{
  element: '[data-tour="your-element"]',
  popover: {
    title: '🎯 Step Title',
    description: 'Step description text',
    side: 'bottom', // top, bottom, left, right
    align: 'start', // start, center, end
  },
}
```

### Styling Changes
Edit `src/app/tour-styles.css` to modify:
- Background colors/opacity
- Border styles
- Button gradients
- Font sizes
- Spacing
- Animations

### Reset Tour for Testing
Clear localStorage in browser console:
```javascript
localStorage.removeItem('jukebox-tour-completed')
```

## Mobile Responsiveness
Tour automatically adjusts for mobile:
- Smaller max-width (90vw)
- Reduced font sizes
- Compact padding
- Wrapped footer buttons
- Smaller border radius

## Browser Compatibility
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ⚠️ Requires JavaScript enabled

## Dependencies
- `driver.js` - Tour library (installed via npm)
- React hooks (useState, useEffect, useCallback)
- localStorage API

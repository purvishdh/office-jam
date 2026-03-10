'use client'
import { useEffect, useCallback } from 'react'
import { driver, type Driver, type Config } from 'driver.js'

const TOUR_STORAGE_KEY = 'jukebox-tour-completed'

export function useAppTour(groupId: string, memberName: string) {
  const startTour = useCallback(() => {
    const driverConfig: Config = {
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      popoverClass: 'jukebox-tour-popover',
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it! 🎉',
      steps: [
        {
          element: 'body',
          popover: {
            title: '🎵 Welcome to Office Jukebox!',
            description: 'Your real-time collaborative music player. Let\'s take a quick tour to show you how it works!',
            align: 'center',
          },
        },
        {
          element: '[data-tour="group-name"]',
          popover: {
            title: '🏷️ Your Party Room',
            description: 'This is your group\'s unique room. Share the URL or QR code with your team to invite them!',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="dj-toggle"]',
          popover: {
            title: '👑 DJ Mode',
            description: 'Toggle DJ Mode to take control of playback. When ON, only the DJ can play/pause/skip. When OFF, everyone can control the music!',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="playlist"]',
          popover: {
            title: '📝 Playlist',
            description: 'Add YouTube videos or entire playlists here! Drag songs to reorder, and everyone sees changes in real-time.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="add-song"]',
          popover: {
            title: '➕ Add Songs',
            description: 'Paste any YouTube URL (video or playlist) here. You can also drag & drop or paste directly into the box!',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '[data-tour="voting"]',
          popover: {
            title: '👍👎 Voting System',
            description: 'Upvote songs you love or downvote ones you don\'t. If majority downvotes (>50%), the song auto-skips!',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="player"]',
          popover: {
            title: '🎧 Now Playing',
            description: 'See what\'s currently playing with album art. Click the progress bar to seek, and use controls to play/pause/skip.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="player-controls"]',
          popover: {
            title: '⏯️ Playback Controls',
            description: 'Control playback from here or your phone\'s lock screen! Works in the background on mobile devices.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '[data-tour="members"]',
          popover: {
            title: '👥 Live Members',
            description: 'See everyone who\'s currently online in your room. The crown 👑 shows who\'s the DJ.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="qr-code"]',
          popover: {
            title: '📱 Share & Join',
            description: 'Scan this QR code with your phone to join instantly! Perfect for getting everyone connected quickly.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: 'body',
          popover: {
            title: '🎉 You\'re All Set!',
            description: 'Start adding songs and enjoy collaborative music with your team. Click the Help (?) button anytime to see this tour again!',
            align: 'center',
          },
        },
      ],
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true')
        driverObj.destroy()
      },
    }

    const driverObj: Driver = driver(driverConfig)
    driverObj.drive()
  }, [])

  // Auto-start tour on first visit
  useEffect(() => {
    if (!groupId || !memberName) return
    
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!hasSeenTour) {
      // Delay to let the page render first
      const timer = setTimeout(() => {
        startTour()
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [groupId, memberName, startTour])

  return { startTour }
}

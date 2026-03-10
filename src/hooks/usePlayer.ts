'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Group, Song } from '@/lib/types'

/**
 * Check if a song should be auto-skipped due to majority downvotes
 */
function shouldAutoSkip(song: Song | undefined, totalMembers: number): boolean {
  if (!song || totalMembers === 0) return false
  
  const downvoteCount = song.downvotes?.length ?? 0
  const majority = totalMembers / 2
  
  // Auto-skip if strict majority (>50%) voted thumbs down
  return downvoteCount > majority
}

// Update the Media Session API so the phone lock screen / notification bar
// shows the current song with artwork and playback controls.
function updateMediaSession(song: Song, isPlaying: boolean) {
  if (!('mediaSession' in navigator)) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artwork: [{ src: song.thumbnail, sizes: '256x256', type: 'image/jpeg' }],
  })
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
}

export function usePlayer(group: Group | undefined, totalMembers: number = 0) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedUrlRef = useRef<string | null>(null)
  const groupRef = useRef<Group | undefined>(group)
  const groupIdRef = useRef<string | undefined>(group?.id)
  const totalMembersRef = useRef<number>(totalMembers)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const autoAdvancingRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  // Keep refs fresh inside event callbacks
  useEffect(() => {
    groupRef.current = group
    groupIdRef.current = group?.id
    totalMembersRef.current = totalMembers
  })

  // Create audio element once on mount
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    // Auto-advance to next song when current one ends
    const handleEnded = async () => {
      const g = groupRef.current
      const groupId = groupIdRef.current
      if (!g || !groupId) return
      
      const nextIdx = (g.current_index ?? 0) + 1
      if (nextIdx < g.playlist.length) {
        console.log(`[Audio] Song ended, auto-advancing from index ${g.current_index} to ${nextIdx}`)
        try {
          await supabase.from('groups').update({
            current_index: nextIdx,
            is_playing: true,
            playback_started_at: new Date().toISOString(),
          }).eq('id', groupId)
        } catch (err) {
          console.error('[Audio] Failed to auto-advance:', err)
        }
      } else {
        console.log('[Audio] Reached end of playlist')
      }
    }

    // Handle stream errors (including expiry)
    const handleError = async () => {
      const g = groupRef.current
      const song: Song | undefined = g?.playlist[g?.current_index ?? 0]
      if (!song?.video_id || !g) return

      console.error('[Audio] Playback error detected for:', song.title)
      console.error('[Audio] Error details:', {
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        error: audio.error
      })
      
      try {
        console.log('[Audio] Attempting to refresh stream URL...')
        
        // Fetch fresh stream URL
        const streamRes = await fetch(`/api/stream?v=${song.video_id}`)
        if (!streamRes.ok) {
          const errorText = await streamRes.text()
          throw new Error(`Failed to refresh stream: ${streamRes.status} ${errorText}`)
        }
        
        const streamData = await streamRes.json()
        console.log('[Audio] Got fresh stream data:', streamData)
        
        // Calculate elapsed time from playback_started_at
        const elapsed = g.playback_started_at
          ? (Date.now() - new Date(g.playback_started_at).getTime()) / 1000
          : 0

        // Update audio source and seek
        audio.src = streamData.url
        loadedUrlRef.current = streamData.url
        audio.load()
        audio.currentTime = Math.max(0, elapsed)

        // Resume if was playing
        if (g.is_playing) {
          await audio.play()
        }

        console.log('[Audio] Stream URL refreshed successfully')
      } catch (err) {
        console.error('[Audio] Failed to recover from stream error:', err)
      }
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
      audioRef.current = null
      loadedUrlRef.current = null
    }
  }, [])

  // Apply group state whenever Supabase pushes an update
  const applyGroupState = useCallback((g: Group) => {
    const audio = audioRef.current
    if (!audio) {
      console.warn('[Audio] Audio element not ready')
      return
    }

    const song: Song | undefined = g.playlist[g.current_index ?? 0]
    if (!song?.piped_url) {
      console.log('[Audio] No current song or URL available')
      audio.pause()
      setIsPlaying(false)
      return
    }

    // Check if the stream URL has expired
    const now = Math.floor(Date.now() / 1000)
    if (song.piped_url_expires && now > song.piped_url_expires) {
      console.log('[Audio] Stream URL expired, will be refreshed on error')
      // Let the error handler refresh it
    }

    const urlChanged = song.piped_url !== loadedUrlRef.current

    if (urlChanged) {
      console.log('[Audio] Loading new song:', song.title)
      loadedUrlRef.current = song.piped_url
      audio.src = song.piped_url
      audio.load()
    }

    // Calculate elapsed time - but if URL just changed, treat timestamp as fresh
    const elapsed = g.playback_started_at
      ? (Date.now() - new Date(g.playback_started_at).getTime()) / 1000
      : 0

    // When song changes, only use elapsed time if it's recent (within 5 seconds)
    // This prevents using old timestamp when song was just removed/skipped
    const safeElapsed = urlChanged && elapsed > 5 ? 0 : elapsed

    if (g.is_playing) {
      // Re-sync position if we're off by more than 2 seconds
      if (!urlChanged && Math.abs(audio.currentTime - safeElapsed) > 2) {
        console.log('[Audio] Re-syncing playback position:', safeElapsed)
        audio.currentTime = Math.max(0, safeElapsed)
      } else if (urlChanged) {
        audio.currentTime = Math.max(0, safeElapsed)
      }
      
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[Audio] Autoplay blocked or audio failed:', err.message)
          // Show toast notification on first autoplay block
          if (typeof window !== 'undefined' && !sessionStorage.getItem('autoplay-warned')) {
            sessionStorage.setItem('autoplay-warned', '1')
            // User will need to tap play manually due to browser autoplay policy
          }
        })
      }
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }

    updateMediaSession(song, g.is_playing)
  }, [])

  // Re-apply state whenever relevant group fields change
  useEffect(() => {
    if (!group) {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        setIsPlaying(false)
      }
      return
    }
    applyGroupState(group)
  }, [group, applyGroupState])

  // Monitor current song for majority downvotes and auto-skip
  useEffect(() => {
    if (!group) return
    
    const currentSong = group.playlist[group.current_index ?? 0]
    if (!currentSong) return
    
    // Check if current song should be auto-skipped
    if (shouldAutoSkip(currentSong, totalMembers)) {
      const groupId = group.id
      
      console.log(`[Voting] Auto-skipping "${currentSong.title}" due to majority downvotes`)
      
      // Remove current song and auto-advance
      const newPlaylist = group.playlist
        .filter(s => s.id !== currentSong.id)
        .map((s, i) => ({ ...s, order: i }))
      
      const newCurrentIndex = Math.min(group.current_index ?? 0, newPlaylist.length - 1)
      
      supabase.from('groups').update({
        playlist: newPlaylist,
        current_index: newCurrentIndex,
        playback_started_at: newPlaylist.length > 0 ? new Date().toISOString() : null,
        is_playing: newPlaylist.length > 0,
      }).eq('id', groupId).then(({ error }) => {
        if (error) {
          console.error('[Voting] Failed to auto-skip song:', error)
        }
      })
    }
  }, [group?.playlist, group?.current_index, totalMembers, group])

  // Wire up Media Session action handlers so lock screen buttons work
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const handlePlay = () => {
      const groupId = groupIdRef.current
      const audio = audioRef.current
      if (!groupId || !audio) return
      supabase.from('groups').update({
        is_playing: true,
        playback_started_at: new Date(Date.now() - audio.currentTime * 1000).toISOString(),
      }).eq('id', groupId)
    }

    const handlePause = () => {
      const groupId = groupIdRef.current
      if (!groupId) return
      supabase.from('groups').update({ is_playing: false, playback_started_at: null }).eq('id', groupId)
    }

    const handleNext = () => {
      const g = groupRef.current
      const groupId = groupIdRef.current
      if (!g || !groupId) return
      const nextIndex = (g.current_index ?? 0) + 1
      if (nextIndex >= g.playlist.length) return
      loadedUrlRef.current = null
      supabase.from('groups').update({
        current_index: nextIndex,
        is_playing: true,
        playback_started_at: new Date().toISOString(),
      }).eq('id', groupId)
    }

    const handlePrev = () => {
      const g = groupRef.current
      const groupId = groupIdRef.current
      if (!g || !groupId) return
      const prevIndex = Math.max(0, (g.current_index ?? 0) - 1)
      loadedUrlRef.current = null
      supabase.from('groups').update({
        current_index: prevIndex,
        is_playing: true,
        playback_started_at: new Date().toISOString(),
      }).eq('id', groupId)
    }

    navigator.mediaSession.setActionHandler('play', handlePlay)
    navigator.mediaSession.setActionHandler('pause', handlePause)
    navigator.mediaSession.setActionHandler('nexttrack', handleNext)
    navigator.mediaSession.setActionHandler('previoustrack', handlePrev)

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  }, [])

  // Wake Lock: keep screen on while playing
  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    const requestWakeLock = async () => {
      try {
        const wakeLock = await navigator.wakeLock.request('screen')
        wakeLockRef.current = wakeLock
      } catch (err) {
        console.warn('Wake Lock request failed:', err)
      }
    }

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }

    if (isPlaying) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }

    return () => {
      releaseWakeLock()
    }
  }, [isPlaying])

  // Progress polling with auto-advance fallback
  useEffect(() => {
    const id = setInterval(() => {
      const audio = audioRef.current
      const g = groupRef.current
      const groupId = groupIdRef.current
      
      if (!audio) return
      
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration)
        setDuration(audio.duration)
        
        // Fallback auto-advance: if song is playing and near the end (>99.5% done),
        // auto-advance to next song. This catches cases where 'ended' event doesn't fire.
        if (g && groupId && g.is_playing && !autoAdvancingRef.current) {
          const progress = audio.currentTime / audio.duration
          if (progress > 0.995 && audio.duration > 2) {
            const nextIdx = (g.current_index ?? 0) + 1
            if (nextIdx < g.playlist.length) {
              autoAdvancingRef.current = true
              console.log(`[Audio] Auto-advance fallback triggered at ${(progress * 100).toFixed(1)}% of song`)
              supabase.from('groups').update({
                current_index: nextIdx,
                is_playing: true,
                playback_started_at: new Date().toISOString(),
              }).eq('id', groupId).then(() => {
                autoAdvancingRef.current = false
              })
            }
          }
        }
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  const togglePlay = useCallback(async () => {
    const groupId = groupIdRef.current
    const audio = audioRef.current
    const g = groupRef.current
    if (!groupId || !audio || !g) {
      return
    }
    const nowPlaying = !g.is_playing
    const { error } = await supabase.from('groups').update({
      is_playing: nowPlaying,
      playback_started_at: nowPlaying
        ? new Date(Date.now() - audio.currentTime * 1000).toISOString()
        : null,
    }).eq('id', groupId)
    
    if (error) {
      console.error('[Audio] Failed to toggle play:', error)
    }
  }, [])

  const skipNext = useCallback(async () => {
    const groupId = groupIdRef.current
    const g = groupRef.current
    if (!groupId || !g) return
    const nextIndex = (g.current_index ?? 0) + 1
    if (nextIndex >= g.playlist.length) return
    loadedUrlRef.current = null
    const { error } = await supabase.from('groups').update({
      current_index: nextIndex,
      is_playing: true,
      playback_started_at: new Date().toISOString(),
    }).eq('id', groupId)
    
    if (error) {
      console.error('[Audio] Failed to skip next:', error)
    }
  }, [])

  const skipPrev = useCallback(async () => {
    const groupId = groupIdRef.current
    const g = groupRef.current
    if (!groupId || !g) return
    const prevIndex = Math.max(0, (g.current_index ?? 0) - 1)
    loadedUrlRef.current = null
    const { error } = await supabase.from('groups').update({
      current_index: prevIndex,
      is_playing: true,
      playback_started_at: new Date().toISOString(),
    }).eq('id', groupId)
    
    if (error) {
      console.error('[Audio] Failed to skip prev:', error)
    }
  }, [])

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current
    const groupId = groupIdRef.current
    const g = groupRef.current
    if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return
    const newTime = Math.max(0, Math.min(fraction * audio.duration, audio.duration))
    audio.currentTime = newTime

    // Sync seek to Supabase so other devices see the new position
    if (groupId && g?.is_playing) {
      supabase.from('groups').update({
        playback_started_at: new Date(Date.now() - newTime * 1000).toISOString(),
      }).eq('id', groupId)
    }
  }, [])

  const currentSong: Song | undefined = group?.playlist[group?.current_index ?? 0]

  return { isPlaying, progress, duration, currentSong, togglePlay, skipNext, skipPrev, seek }
}

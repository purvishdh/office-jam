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
  const crossfadeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const nextAudioRef = useRef<HTMLAudioElement | null>(null)

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
      const loopMode = g.loop_mode ?? false
      const shuffleMode = g.shuffle_mode ?? false
      
      // Determine next index
      let targetIdx = nextIdx
      
      if (shuffleMode && g.playlist.length > 0) {
        // Random next song (excluding current)
        const currentIdx = g.current_index ?? 0
        const availableIndices = g.playlist
          .map((_, i) => i)
          .filter(i => i !== currentIdx)
        targetIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)]
      } else if (nextIdx >= g.playlist.length && loopMode) {
        // Loop back to start
        targetIdx = 0
      } else if (nextIdx >= g.playlist.length) {
        // End of playlist, no loop
        console.log('[Audio] Reached end of playlist')
        await supabase.from('groups').update({
          is_playing: false,
        }).eq('id', groupId)
        return
      }
      
      console.log(`[Audio] Song ended, advancing to index ${targetIdx}`)
      try {
        await supabase.from('groups').update({
          current_index: targetIdx,
          is_playing: true,
          playback_started_at: new Date().toISOString(),
        }).eq('id', groupId)
      } catch (err) {
        console.error('[Audio] Failed to auto-advance:', err)
      }
    }

    // Handle stream errors (including expiry)
    const handleError = async () => {
      const g = groupRef.current
      const song: Song | undefined = g?.playlist[g?.current_index ?? 0]
      const groupId = groupIdRef.current
      if (!song?.video_id || !g || !groupId) return

      console.error('[Audio] Playback error detected for:', song.title)
      console.error('[Audio] Error details:', {
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        error: audio.error
      })
      
      try {
        console.log('[Audio] Attempting to refresh stream URL (attempt 1/2)...')
        
        // Fetch fresh stream URL with timeout
        const streamRes = await fetch(`/api/stream?v=${song.video_id}`, {
          signal: AbortSignal.timeout(8000) // 8 second timeout
        })
        
        if (!streamRes.ok) {
          const errorText = await streamRes.text()
          console.error('[Audio] Stream refresh failed:', errorText)
          throw new Error(`Failed to refresh stream: ${streamRes.status}`)
        }
        
        const streamData = await streamRes.json()
        console.log('[Audio] Got fresh stream data from:', streamData.source)
        
        // Verify we got a streamable URL
        if (!streamData.isStreamable || !streamData.url) {
          throw new Error('Stream source returned non-streamable URL')
        }
        
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
          console.log('[Audio] Stream URL refreshed and playback resumed')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[Audio] Failed to recover from stream error:', message)
        
        // If recovery failed, skip to next song to avoid getting stuck
        console.log('[Audio] Skipping to next song due to unrecoverable error...')
        const nextIdx = (g.current_index ?? 0) + 1
        
        if (nextIdx < g.playlist.length) {
          try {
            await supabase.from('groups').update({
              current_index: nextIdx,
              is_playing: true,
              playback_started_at: new Date().toISOString(),
            }).eq('id', groupId)
            console.log('[Audio] Advanced to next song')
          } catch (skipErr) {
            console.error('[Audio] Failed to skip to next song:', skipErr)
          }
        } else {
          // Reached end of playlist, stop playing
          console.log('[Audio] Reached end of playlist, stopping playback')
          try {
            await supabase.from('groups').update({
              is_playing: false,
            }).eq('id', groupId)
          } catch (stopErr) {
            console.error('[Audio] Failed to stop playback:', stopErr)
          }
        }
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
  const applyGroupState = useCallback(async (g: Group) => {
    const audio = audioRef.current
    if (!audio) {
      console.warn('[Audio] Audio element not ready')
      return
    }

    // Apply playback speed
    const playbackSpeed = g.playback_speed ?? 1
    audio.playbackRate = playbackSpeed

    const song: Song | undefined = g.playlist?.[g.current_index ?? 0]
    if (!song) {
      console.log('[Audio] No current song available')
      audio.pause()
      setIsPlaying(false)
      return
    }

    // Handle crossfade
    const crossfadeDuration = g.crossfade_duration ?? 0
    if (crossfadeDuration > 0 && audio.duration > 0) {
      // Start crossfade when close to the end
      const timeUntilEnd = audio.duration - audio.currentTime
      if (timeUntilEnd > 0 && timeUntilEnd <= crossfadeDuration && !crossfadeTimeoutRef.current) {
        const nextSong = g.playlist[(g.current_index ?? 0) + 1]
        if (nextSong?.piped_url) {
          console.log(`[Audio] Starting ${crossfadeDuration}s crossfade`)
          
          // Prepare next audio element
          const nextAudio = new Audio(nextSong.piped_url)
          nextAudio.volume = 0
          nextAudio.playbackRate = playbackSpeed
          nextAudioRef.current = nextAudio
          
          // Start playing next song at 0 volume
          nextAudio.play().catch(err => console.warn('[Audio] Crossfade pre-load failed:', err))
          
          // Gradually fade out current, fade in next
          const fadeSteps = 20
          const fadeInterval = (crossfadeDuration * 1000) / fadeSteps
          let step = 0
          
          const fadeTimer = setInterval(() => {
            step++
            const progress = step / fadeSteps
            audio.volume = Math.max(0, 1 - progress)
            if (nextAudio) nextAudio.volume = Math.min(1, progress)
            
            if (step >= fadeSteps) {
              clearInterval(fadeTimer)
              audio.volume = 1
              if (nextAudio) {
                nextAudio.pause()
                nextAudio.src = ''
                nextAudioRef.current = null
              }
            }
          }, fadeInterval)
          
          crossfadeTimeoutRef.current = setTimeout(() => {
            clearInterval(fadeTimer)
            crossfadeTimeoutRef.current = null
          }, crossfadeDuration * 1000 + 500)
        }
      }
    }

    // If song has no piped_url or has invalid URL, fetch it now
    if (!song.piped_url || song.piped_url.includes('youtube.com/watch?v=') || 
        song.piped_url.includes('youtube.com/embed/') || song.piped_url.includes('youtu.be/')) {
      
      const groupId = groupIdRef.current
      if (!groupId || !song.video_id) {
        console.error('[Audio] Cannot fetch stream URL - missing groupId or video_id')
        audio.pause()
        setIsPlaying(false)
        return
      }

      console.log('[Audio] Fetching stream URL for:', song.title)
      
      try {
        const streamRes = await fetch(`/api/stream?v=${song.video_id}`)
        if (!streamRes.ok) {
          const errorText = await streamRes.text()
          console.error('[Audio] Stream fetch failed:', errorText)
          
          // Auto-skip to next song
          const nextIdx = (g.current_index ?? 0) + 1
          if (nextIdx < g.playlist.length) {
            console.log('[Audio] Skipping to next song...')
            await supabase.from('groups').update({
              current_index: nextIdx,
              is_playing: true,
              playback_started_at: new Date().toISOString(),
            }).eq('id', groupId)
          } else {
            console.log('[Audio] No more songs, stopping playback')
            await supabase.from('groups').update({
              is_playing: false,
            }).eq('id', groupId)
          }
          return
        }
        
        const streamData = await streamRes.json()
        if (!streamData.isStreamable || !streamData.url) {
          console.error('[Audio] Got non-streamable URL from API')
          
          // Auto-skip to next song
          const nextIdx = (g.current_index ?? 0) + 1
          if (nextIdx < g.playlist.length) {
            await supabase.from('groups').update({
              current_index: nextIdx,
              is_playing: true,
              playback_started_at: new Date().toISOString(),
            }).eq('id', groupId)
          }
          return
        }
        
        console.log('[Audio] Got fresh stream URL, updating playlist...')
        
        // Update the song in the playlist with the new URL
        const updatedPlaylist = [...g.playlist]
        updatedPlaylist[g.current_index] = {
          ...song,
          piped_url: streamData.url,
          piped_url_expires: streamData.expires
        }
        
        await supabase.from('groups').update({
          playlist: updatedPlaylist
        }).eq('id', groupId)
        
        // The update will trigger applyGroupState again via Realtime
        return
      } catch (err) {
        console.error('[Audio] Error fetching stream URL:', err)
        
        // Auto-skip to next song
        const nextIdx = (g.current_index ?? 0) + 1
        if (nextIdx < g.playlist.length) {
          await supabase.from('groups').update({
            current_index: nextIdx,
            is_playing: true,
            playback_started_at: new Date().toISOString(),
          }).eq('id', groupId)
        }
        return
      }
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
    
    const currentSong = group.playlist?.[group.current_index ?? 0]
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
    
    const shuffleMode = g.shuffle_mode ?? false
    let nextIndex: number
    
    if (shuffleMode && g.playlist.length > 1) {
      // Random next song (excluding current)
      const currentIdx = g.current_index ?? 0
      const availableIndices = g.playlist
        .map((_, i) => i)
        .filter(i => i !== currentIdx)
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else {
      nextIndex = (g.current_index ?? 0) + 1
    }
    
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

  const currentSong: Song | undefined = group?.playlist?.[group?.current_index ?? 0]

  return { isPlaying, progress, duration, currentSong, togglePlay, skipNext, skipPrev, seek }
}

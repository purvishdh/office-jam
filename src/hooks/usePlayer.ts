'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Group, Song } from '@/lib/types'

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

export function usePlayer(group: Group | undefined, _containerId?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedUrlRef = useRef<string | null>(null)
  const groupRef = useRef<Group | undefined>(group)
  const groupIdRef = useRef<string | undefined>(group?.id)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  // Keep refs fresh inside event callbacks
  useEffect(() => {
    groupRef.current = group
    groupIdRef.current = group?.id
  })

  // Create audio element once on mount
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    // Auto-advance to next song when current one ends
    const handleEnded = () => {
      const g = groupRef.current
      if (!g) return
      const nextIdx = (g.current_index ?? 0) + 1
      if (nextIdx < g.playlist.length) {
        supabase.from('groups').update({
          current_index: nextIdx,
          is_playing: true,
          playback_started_at: new Date().toISOString(),
        }).eq('id', groupIdRef.current!)
      }
    }

    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.src = ''
      audioRef.current = null
      loadedUrlRef.current = null
    }
  }, [])

  // Apply group state whenever Supabase pushes an update
  const applyGroupState = useCallback((g: Group) => {
    const audio = audioRef.current
    if (!audio) return

    const song: Song | undefined = g.playlist[g.current_index ?? 0]
    if (!song?.piped_url) return

    const elapsed = g.playback_started_at
      ? (Date.now() - new Date(g.playback_started_at).getTime()) / 1000
      : 0

    const urlChanged = song.piped_url !== loadedUrlRef.current

    if (urlChanged) {
      loadedUrlRef.current = song.piped_url
      audio.src = song.piped_url
      audio.load()
    }

    if (g.is_playing) {
      // Re-sync position if we're off by more than 2 seconds
      if (!urlChanged && Math.abs(audio.currentTime - elapsed) > 2) {
        audio.currentTime = Math.max(0, elapsed)
      } else if (urlChanged) {
        audio.currentTime = Math.max(0, elapsed)
      }
      audio.play().catch(() => {
        // Autoplay blocked — the user will need to tap play manually
      })
    } else {
      audio.pause()
    }

    setIsPlaying(g.is_playing)
    updateMediaSession(song, g.is_playing)
  }, [])

  // Re-apply state whenever relevant group fields change
  useEffect(() => {
    if (!group) return
    applyGroupState(group)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.is_playing, group?.playback_started_at, group?.current_index, group?.playlist, applyGroupState])

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

  // Progress polling
  useEffect(() => {
    const id = setInterval(() => {
      const audio = audioRef.current
      if (!audio) return
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration)
        setDuration(audio.duration)
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  const togglePlay = useCallback(async () => {
    const groupId = groupIdRef.current
    const audio = audioRef.current
    if (!groupId || !audio) return
    const nowPlaying = !isPlaying
    await supabase.from('groups').update({
      is_playing: nowPlaying,
      playback_started_at: nowPlaying
        ? new Date(Date.now() - audio.currentTime * 1000).toISOString()
        : null,
    }).eq('id', groupId)
  }, [isPlaying])

  const skipNext = useCallback(async () => {
    const groupId = groupIdRef.current
    const g = groupRef.current
    if (!groupId || !g) return
    const nextIndex = (g.current_index ?? 0) + 1
    if (nextIndex >= g.playlist.length) return
    loadedUrlRef.current = null
    await supabase.from('groups').update({
      current_index: nextIndex,
      is_playing: true,
      playback_started_at: new Date().toISOString(),
    }).eq('id', groupId)
  }, [])

  const skipPrev = useCallback(async () => {
    const groupId = groupIdRef.current
    const g = groupRef.current
    if (!groupId || !g) return
    const prevIndex = Math.max(0, (g.current_index ?? 0) - 1)
    loadedUrlRef.current = null
    await supabase.from('groups').update({
      current_index: prevIndex,
      is_playing: true,
      playback_started_at: new Date().toISOString(),
    }).eq('id', groupId)
  }, [])

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current
    if (!audio || audio.duration <= 0) return
    audio.currentTime = Math.max(0, Math.min(fraction * audio.duration, audio.duration))
  }, [])

  const currentSong: Song | undefined = group?.playlist[group?.current_index ?? 0]

  return { isPlaying, progress, duration, currentSong, togglePlay, skipNext, skipPrev, seek }
}

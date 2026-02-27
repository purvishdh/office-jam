'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Group, Song } from '@/lib/types'

function loadYTScript(): Promise<void> {
  return new Promise((resolve) => {
    // Already loaded
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      resolve()
      return
    }
    // Script injected but not yet ready — chain onto existing callback
    if (typeof window !== 'undefined' && window.onYouTubeIframeAPIReady) {
      const existing = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        existing()
        resolve()
      }
      return
    }
    // First caller — inject script
    window.onYouTubeIframeAPIReady = resolve
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
}

export function usePlayer(group: Group | undefined, containerId: string) {
  const playerRef = useRef<YT.Player | null>(null)
  const playerReadyRef = useRef(false)
  const pendingGroupRef = useRef<Group | null>(null)
  const loadedVideoIdRef = useRef<string | null>(null)
  const groupRef = useRef<Group | undefined>(group)
  const groupIdRef = useRef<string | undefined>(group?.id)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  // Keep refs in sync so onStateChange closure sees fresh values
  useEffect(() => {
    groupRef.current = group
    groupIdRef.current = group?.id
  })

  const applyGroupState = useCallback((g: Group) => {
    const player = playerRef.current
    if (!player) return

    const song: Song | undefined = g.playlist[g.current_index ?? 0]
    if (!song) return

    const elapsed = g.playback_started_at
      ? (Date.now() - new Date(g.playback_started_at).getTime()) / 1000
      : 0

    if (song.video_id !== loadedVideoIdRef.current) {
      loadedVideoIdRef.current = song.video_id
      if (g.is_playing) {
        player.loadVideoById(song.video_id, Math.max(0, elapsed))
      } else {
        player.cueVideoById(song.video_id, Math.max(0, elapsed))
      }
    } else {
      const state = player.getPlayerState()
      if (g.is_playing) {
        const currentTime = player.getCurrentTime()
        if (Math.abs(currentTime - elapsed) > 2) {
          player.seekTo(elapsed, true)
        }
        if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
          player.playVideo()
        }
      } else {
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
          player.pauseVideo()
        }
      }
    }

    setIsPlaying(g.is_playing)
  }, [])

  // Init effect — load script and create player once
  useEffect(() => {
    let player: YT.Player | null = null
    let destroyed = false

    loadYTScript().then(() => {
      if (destroyed) return

      player = new YT.Player(containerId, {
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true
            if (pendingGroupRef.current) {
              applyGroupState(pendingGroupRef.current)
              pendingGroupRef.current = null
            }
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
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
          },
        },
      })

      playerRef.current = player
    })

    return () => {
      destroyed = true
      if (player) {
        try { player.destroy() } catch {}
      }
      playerRef.current = null
      playerReadyRef.current = false
      loadedVideoIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId])

  // Group-watch effect
  useEffect(() => {
    if (!group) return
    if (!playerReadyRef.current) {
      pendingGroupRef.current = group
      return
    }
    applyGroupState(group)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.is_playing, group?.playback_started_at, group?.current_index, group?.playlist, applyGroupState])

  // Progress polling
  useEffect(() => {
    const id = setInterval(() => {
      const player = playerRef.current
      if (!player || !playerReadyRef.current) return
      try {
        const dur = player.getDuration()
        const cur = player.getCurrentTime()
        if (dur > 0) {
          setProgress(cur / dur)
          setDuration(dur)
        }
      } catch {
        console.warn('Error polling player progress, likely due to player not being ready yet')
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  const togglePlay = useCallback(async () => {
    const groupId = groupIdRef.current
    if (!groupId) return
    const nowPlaying = !isPlaying
    const currentTime = playerRef.current?.getCurrentTime() ?? 0
    await supabase.from('groups').update({
      is_playing: nowPlaying,
      playback_started_at: nowPlaying
        ? new Date(Date.now() - currentTime * 1000).toISOString()
        : null,
    }).eq('id', groupId)
  }, [isPlaying])

  const skipNext = useCallback(async () => {
    const groupId = groupIdRef.current
    const g = groupRef.current
    if (!groupId || !g) return
    const nextIndex = (g.current_index ?? 0) + 1
    if (nextIndex >= g.playlist.length) return
    loadedVideoIdRef.current = null
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
    loadedVideoIdRef.current = null
    await supabase.from('groups').update({
      current_index: prevIndex,
      is_playing: true,
      playback_started_at: new Date().toISOString(),
    }).eq('id', groupId)
  }, [])

  const seek = useCallback((fraction: number) => {
    const player = playerRef.current
    if (!player) return
    const duration = player.getDuration()
    if (duration <= 0) return
    const targetTime = Math.max(0, Math.min(fraction * duration, duration))
    player.seekTo(targetTime, true)
  }, [])

  const currentSong: Song | undefined = group?.playlist[group?.current_index ?? 0]

  return { isPlaying, progress, duration, currentSong, togglePlay, skipNext, skipPrev, seek }
}

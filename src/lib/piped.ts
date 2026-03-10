import type { Song } from './types'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function extractVideoId(youtubeUrl: string): string | null {
  // Handle youtu.be/VIDEO_ID
  const shortMatch = youtubeUrl.match(/youtu\.be\/([^?&/]+)/)
  if (shortMatch) return shortMatch[1]
  // Handle /embed/VIDEO_ID
  const embedMatch = youtubeUrl.match(/\/embed\/([^?&/]+)/)
  if (embedMatch) return embedMatch[1]
  // Handle ?v=VIDEO_ID or &v=VIDEO_ID
  const watchMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
  return watchMatch?.[1] ?? null
}

export function extractPlaylistId(youtubeUrl: string): string | null {
  // Handle ?list=PLAYLIST_ID or &list=PLAYLIST_ID
  const listMatch = youtubeUrl.match(/[?&]list=([^&]+)/)
  return listMatch?.[1] ?? null
}

export function isPlaylistUrl(youtubeUrl: string): boolean {
  return extractPlaylistId(youtubeUrl) !== null
}

export async function fetchSong(youtubeUrl: string, currentQueueLength: number): Promise<Song> {
  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) throw new Error('Invalid YouTube URL')

  const res = await fetch(`/api/song?v=${videoId}`)
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Failed to fetch song' }))
    throw new Error(error ?? 'Failed to fetch song')
  }
  const video = await res.json()

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    title: video.title,
    video_id: video.video_id,
    piped_url: video.piped_url,
    piped_url_expires: video.piped_url_expires,
    thumbnail: video.thumbnail,
    duration: video.duration,
    votes: 0,
    order: currentQueueLength,
    upvotes: [],
    downvotes: [],
  }
}

export async function fetchPlaylist(youtubeUrl: string, currentQueueLength: number): Promise<Song[]> {
  const playlistId = extractPlaylistId(youtubeUrl)
  if (!playlistId) throw new Error('Invalid YouTube playlist URL')

  const res = await fetch(`/api/playlist?list=${playlistId}`)
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Failed to fetch playlist' }))
    throw new Error(error ?? 'Failed to fetch playlist')
  }
  const data = await res.json()

  interface PlaylistVideo {
    title: string
    video_id: string
    thumbnail: string
    duration: number
  }

  // Transform playlist items into Song objects
  // Note: piped_url will be fetched on-demand when song is played
  return data.songs.map((video: PlaylistVideo, index: number) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${index}`,
    title: video.title,
    video_id: video.video_id,
    piped_url: `https://www.youtube.com/watch?v=${video.video_id}`, // Placeholder - will be fetched on play
    piped_url_expires: Math.floor(Date.now() / 1000) + 3600,
    thumbnail: video.thumbnail,
    duration: video.duration,
    votes: 0,
    order: currentQueueLength + index,
    upvotes: [],
    downvotes: [],
  }))
}

/** @deprecated kept for backward compat with old JSONB data that has duration as "MM:SS" string */
export { formatDuration }

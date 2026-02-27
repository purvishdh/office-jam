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
    thumbnail: video.thumbnail,
    duration: video.duration,
    votes: 0,
    order: currentQueueLength,
  }
}

/** @deprecated kept for backward compat with old JSONB data that has duration as "MM:SS" string */
export { formatDuration }

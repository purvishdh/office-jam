import type { Song } from './types'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Check if a URL is a YouTube watch/embed URL (not a direct stream)
 */
export function isInvalidStreamUrl(url: string): boolean {
  return url.includes('youtube.com/watch?v=') || 
         url.includes('youtube.com/embed/') ||
         url.includes('youtu.be/')
}

/**
 * Test if a stream URL is actually loadable (quick HEAD request)
 * Returns true if URL appears to be valid audio stream
 */
export async function validateStreamUrl(url: string): Promise<boolean> {
  // Skip validation for empty URLs (will be fetched later)
  if (!url) return true
  
  // Reject known bad patterns immediately
  if (isInvalidStreamUrl(url)) return false
  
  try {
    // Try HEAD request first (faster, no download)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 sec timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    // Check if response is audio content
    const contentType = response.headers.get('content-type') || ''
    const isAudio = contentType.includes('audio') || 
                    contentType.includes('mpeg') || 
                    contentType.includes('mp4') ||
                    contentType.includes('application/octet-stream')
    
    return response.ok && isAudio
  } catch (err) {
    // If HEAD fails, URL is likely invalid
    console.warn('[Validation] Stream URL validation failed:', err)
    return false
  }
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

  // Validate that we got a proper stream URL, not a YouTube watch URL
  if (isInvalidStreamUrl(video.piped_url)) {
    throw new Error('Stream URL not available. Service may be down or quota exceeded.')
  }

  // Quick validation that the stream URL is actually loadable
  const isValid = await validateStreamUrl(video.piped_url)
  if (!isValid) {
    throw new Error('Unable to verify stream URL. The video may not be playable or service is unavailable.')
  }

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
  // Note: For playlists, we set a placeholder that will trigger stream fetch on play
  // Using empty string instead of YouTube URL to avoid confusion with real streams
  return data.songs.map((video: PlaylistVideo, index: number) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${index}`,
    title: video.title,
    video_id: video.video_id,
    piped_url: '', // Empty - will be fetched when song is about to play
    piped_url_expires: 0, // Indicate it needs to be fetched
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

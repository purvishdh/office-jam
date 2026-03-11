import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime for YouTube streaming libraries
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface AudioSource {
  url: string
  source: 'youtube-mp36' | 'youtube-downloader' | 'youtube-audio-video-url' | 'embed'
  mimeType: string
  isStreamable: boolean
  expires?: number
}

// Attempt 1: YouTube MP36 by ytjar (500 req/month free)
async function tryYouTubeMP36(videoId: string): Promise<AudioSource | null> {
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    console.warn('[YouTube MP36] No RAPIDAPI_KEY configured')
    return null
  }

  try {
    console.log(`[Stream] Trying YouTube MP36 for ${videoId}`)
    
    const response = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[YouTube MP36] HTTP ${response.status}: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    if (data.status === 'ok' && data.link) {
      console.log(`[YouTube MP36] Found audio stream`)
      return {
        url: data.link,
        source: 'youtube-mp36',
        mimeType: 'audio/mpeg',
        isStreamable: true,
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }
    }
    
    console.warn(`[YouTube MP36] Invalid response: ${data.status || 'unknown'}`)
    return null
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[YouTube MP36] failed:`, message)
    return null
  }
}

// Attempt 2: YouTube Downloader Video (1,000 req/month free)
async function tryYouTubeDownloader(videoId: string): Promise<AudioSource | null> {
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    console.warn('[YouTube Downloader] No RAPIDAPI_KEY configured')
    return null
  }

  try {
    console.log(`[Stream] Trying YouTube Downloader for ${videoId}`)
    
    const response = await fetch(`https://youtube-downloader-video.p.rapidapi.com/api/video/info?v=${videoId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'youtube-downloader-video.p.rapidapi.com'
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[YouTube Downloader] HTTP ${response.status}: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // Find audio-only format
    const audioFormat = data.formats?.find((f: { type?: string; url?: string }) => 
      f.type?.includes('audio') && f.url
    )
    
    if (audioFormat?.url) {
      console.log(`[YouTube Downloader] Found audio: ${audioFormat.type}`)
      return {
        url: audioFormat.url,
        source: 'youtube-downloader',
        mimeType: audioFormat.type || 'audio/mp4',
        isStreamable: true,
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }
    }
    
    console.warn(`[YouTube Downloader] No audio format found`)
    return null
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[YouTube Downloader] failed:`, message)
    return null
  }
}

// Attempt 3: YouTube Audio & Video URL (500 req/month free)
async function tryYouTubeAudioVideoURL(videoId: string): Promise<AudioSource | null> {
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    console.warn('[YouTube Audio & Video URL] No RAPIDAPI_KEY configured')
    return null
  }

  try {
    console.log(`[Stream] Trying YouTube Audio & Video URL for ${videoId}`)
    
    const response = await fetch(`https://youtube-audio-and-video-url.p.rapidapi.com/youtube?url=https://www.youtube.com/watch?v=${videoId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'youtube-audio-and-video-url.p.rapidapi.com'
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[YouTube Audio & Video URL] HTTP ${response.status}: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // Find best audio format
    const audioUrl = data.audioUrl || data.audio_url || data.formats?.find((f: { type?: string; url?: string }) => f.type?.includes('audio'))?.url
    
    if (audioUrl) {
      console.log(`[YouTube Audio & Video URL] Found audio stream`)
      return {
        url: audioUrl,
        source: 'youtube-audio-video-url',
        mimeType: 'audio/mp4',
        isStreamable: true,
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }
    }
    
    console.warn(`[YouTube Audio & Video URL] No audio URL found`)
    return null
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[YouTube Audio & Video URL] failed:`, message)
    return null
  }
}

// Main waterfall function - tries each RapidAPI method in order
async function getAudioSource(videoId: string): Promise<AudioSource | null> {
  console.log(`[Stream] Starting RapidAPI audio source waterfall for ${videoId}`)
  
  const result =
    (await tryYouTubeMP36(videoId)) ??
    (await tryYouTubeDownloader(videoId)) ??
    (await tryYouTubeAudioVideoURL(videoId))

  if (result) {
    console.log(`[Stream] Selected source: ${result.source} (streamable: ${result.isStreamable})`)
  } else {
    console.error(`[Stream] All RapidAPI sources failed for ${videoId}`)
  }
  
  return result
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('v')
  
  if (!videoId) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 })
  }

  try {
    const audioSource = await getAudioSource(videoId)
    
    if (!audioSource) {
      console.error(`[Stream] No audio source available for ${videoId}`)
      return NextResponse.json(
        { error: 'No audio stream available. All services failed or quota exceeded.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json({
      url: audioSource.url,
      source: audioSource.source,
      mimeType: audioSource.mimeType,
      isStreamable: audioSource.isStreamable,
      expires: audioSource.expires,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Stream] Failed to get audio source for ${videoId}:`, err)
    return NextResponse.json(
      { error: 'Failed to get audio source', details: message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  const h = parseInt(match?.[1] ?? '0')
  const m = parseInt(match?.[2] ?? '0')
  const s = parseInt(match?.[3] ?? '0')
  return h * 3600 + m * 60 + s
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('v')
  if (!videoId) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  console.log(`[Song API] Fetching YouTube metadata for: ${videoId}`)
  
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`[Song API] YouTube API error: ${res.status}`)
    return NextResponse.json({ error: 'YouTube API error' }, { status: 502 })
  }

  const data = await res.json()
  if (!data.items || data.items.length === 0) {
    console.error(`[Song API] Video not found: ${videoId}`)
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  const item = data.items[0]
  const snippet = item.snippet
  const contentDetails = item.contentDetails

  console.log(`[Song API] Got YouTube metadata for: ${snippet.title}`)

  // Get audio stream URL using the new waterfall approach
  // This now tries multiple sources and should be much more reliable
  let streamData = null
  try {
    console.log(`[Song API] Fetching stream URL using waterfall approach...`)
    const streamRes = await fetch(`${req.nextUrl.origin}/api/stream?v=${videoId}`, {
      signal: AbortSignal.timeout(12000) // 12 second timeout for all attempts
    })
    if (streamRes.ok) {
      streamData = await streamRes.json()
      console.log(`[Song API] Got stream URL from: ${streamData.source} (streamable: ${streamData.isStreamable})`)
    } else {
      console.warn(`[Song API] Stream API failed with ${streamRes.status}, using YouTube fallback`)
      // Use fallback URL instead of failing completely
      streamData = {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        source: 'youtube-fallback',
        isStreamable: false,
        expires: Math.floor(Date.now() / 1000) + 3600,
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[Song API] Stream fetch failed:`, message, `- using YouTube fallback`)
    // Use fallback URL instead of failing completely
    streamData = {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      source: 'youtube-fallback', 
      isStreamable: false,
      expires: Math.floor(Date.now() / 1000) + 3600,
    }
  }

  return NextResponse.json({
    title: snippet.title,
    thumbnail: snippet.thumbnails?.maxres?.url ?? snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
    duration: parseISO8601Duration(contentDetails.duration),
    video_id: videoId,
    piped_url: streamData?.url || `https://www.youtube.com/watch?v=${videoId}`,
    piped_url_expires: streamData?.expires || Math.floor(Date.now() / 1000) + 3600,
  })
}

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

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json({ error: 'YouTube API error' }, { status: 502 })
  }

  const data = await res.json()
  if (!data.items || data.items.length === 0) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  const item = data.items[0]
  const snippet = item.snippet
  const contentDetails = item.contentDetails

  const audioUrl = `https://www.youtube.com/watch?v=${videoId}&listen=1&pp=0&disable_polymer=1`

  return NextResponse.json({
    title: snippet.title,
    thumbnail: snippet.thumbnails?.maxres?.url ?? snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
    duration: parseISO8601Duration(contentDetails.duration),
    video_id: videoId,
    piped_url: audioUrl,
  })
}

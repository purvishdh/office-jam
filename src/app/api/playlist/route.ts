import { NextRequest, NextResponse } from 'next/server'

function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  const h = parseInt(match?.[1] ?? '0')
  const m = parseInt(match?.[2] ?? '0')
  const s = parseInt(match?.[3] ?? '0')
  return h * 3600 + m * 60 + s
}

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get('list')
  if (!playlistId) {
    return NextResponse.json({ error: 'Missing playlist id' }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  console.log(`[Playlist API] Fetching YouTube playlist items for: ${playlistId}`)
  
  try {
    interface PlaylistItem {
      snippet?: {
        resourceId?: {
          videoId?: string
        }
      }
    }
    
    const allItems: PlaylistItem[] = []
    let pageToken = ''
    let pageCount = 0
    const maxPages = 10 // Limit to 500 videos (50 per page)

    // Fetch all playlist items (paginated)
    do {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`
      const playlistRes = await fetch(playlistUrl)
      
      if (!playlistRes.ok) {
        console.error(`[Playlist API] YouTube API error: ${playlistRes.status}`)
        return NextResponse.json({ error: 'YouTube API error' }, { status: 502 })
      }

      const playlistData = await playlistRes.json()
      if (!playlistData.items || playlistData.items.length === 0) {
        break
      }

      allItems.push(...playlistData.items)
      pageToken = playlistData.nextPageToken
      pageCount++
    } while (pageToken && pageCount < maxPages)

    if (allItems.length === 0) {
      console.error(`[Playlist API] Playlist not found or empty: ${playlistId}`)
      return NextResponse.json({ error: 'Playlist not found or empty' }, { status: 404 })
    }

    console.log(`[Playlist API] Found ${allItems.length} items in playlist`)

    // Extract video IDs
    const videoIds = allItems
      .map(item => item.snippet?.resourceId?.videoId)
      .filter(Boolean)
      .slice(0, 50) // Limit to 50 videos to avoid quota issues

    if (videoIds.length === 0) {
      return NextResponse.json({ error: 'No valid videos in playlist' }, { status: 404 })
    }

    // Fetch video details in batches (max 50 per request)
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`
    const videosRes = await fetch(videosUrl)
    
    if (!videosRes.ok) {
      console.error(`[Playlist API] YouTube API error fetching videos: ${videosRes.status}`)
      return NextResponse.json({ error: 'YouTube API error' }, { status: 502 })
    }

    const videosData = await videosRes.json()
    
    interface VideoItem {
      id: string
      snippet: {
        title: string
        thumbnails?: {
          maxres?: { url: string }
          high?: { url: string }
          default?: { url: string }
        }
      }
      contentDetails: {
        duration: string
      }
    }
    
    // Transform into song format (without stream URLs - those will be fetched on-demand)
    const songs = videosData.items.map((item: VideoItem) => {
      const snippet = item.snippet
      const contentDetails = item.contentDetails
      
      return {
        title: snippet.title,
        thumbnail: snippet.thumbnails?.maxres?.url ?? snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
        duration: parseISO8601Duration(contentDetails.duration),
        video_id: item.id,
      }
    })

    console.log(`[Playlist API] Successfully fetched ${songs.length} videos`)

    return NextResponse.json({ songs })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[Playlist API] Error:`, message)
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 })
  }
}

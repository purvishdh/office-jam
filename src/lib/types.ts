export interface Song {
  id: string
  title: string
  video_id: string
  thumbnail: string
  duration: number
  votes: number
  order: number
  piped_url: string
}

export interface Group {
  id: string
  name: string
  playlist: Song[]
  current_index: number
  is_playing: boolean
  playback_started_at: string | null
  lat: number | null
  lng: number | null
  created_at: string
}

export interface Member {
  name: string
  color: string
  joined_at: string
}

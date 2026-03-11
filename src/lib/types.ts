export interface Song {
  id: string
  title: string
  video_id: string
  thumbnail: string
  duration: number
  votes: number
  order: number
  piped_url: string
  piped_url_expires?: number
  upvotes: string[]  // Array of member names who voted thumbs up
  downvotes: string[] // Array of member names who voted thumbs down
}

export interface Group {
  id: string
  name: string
  playlist: Song[]
  current_index: number
  is_playing: boolean
  playback_started_at: string | null
  dj_mode?: boolean
  dj_name?: string
  shuffle_mode?: boolean
  loop_mode?: boolean
  playback_speed?: number
  crossfade_duration?: number
  created_at: string
}

export interface Member {
  name: string
  color: string
  joined_at: string
}

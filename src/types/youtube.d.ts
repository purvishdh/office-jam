declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerVars {
    autoplay?: 0 | 1
    controls?: 0 | 1
    disablekb?: 0 | 1
    playsinline?: 0 | 1
    rel?: 0 | 1
    modestbranding?: 0 | 1
  }

  interface PlayerOptions {
    videoId?: string
    width?: number | string
    height?: number | string
    playerVars?: PlayerVars
    events?: {
      onReady?: (event: { target: Player }) => void
      onStateChange?: (event: { data: PlayerState; target: Player }) => void
      onError?: (event: { data: number; target: Player }) => void
    }
  }

  class Player {
    constructor(el: string | HTMLElement, opts: PlayerOptions)
    playVideo(): void
    pauseVideo(): void
    loadVideoById(videoId: string, startSeconds?: number): void
    cueVideoById(videoId: string, startSeconds?: number): void
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    getCurrentTime(): number
    getDuration(): number
    getPlayerState(): PlayerState
    destroy(): void
  }
}

interface Window {
  YT: typeof YT
  onYouTubeIframeAPIReady: (() => void) | undefined
}

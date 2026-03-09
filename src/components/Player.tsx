'use client'
import Image from 'next/image'
import { usePlayer } from '@/hooks/usePlayer'
import type { Group } from '@/lib/types'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function Player({ group }: { group: Group | undefined }) {
  const { isPlaying, progress, duration, currentSong, togglePlay, skipNext, skipPrev, seek } = usePlayer(group)

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    seek(fraction)
  }

  const currentTime = duration * progress

  return (
    <div className="bg-gradient-to-br from-purple-900/30 via-violet-900/20 to-fuchsia-900/30 backdrop-blur-2xl rounded-3xl p-6 border border-purple-500/30 shadow-2xl shadow-purple-500/10">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-1 w-1 rounded-full bg-purple-400 animate-pulse" />
        <h3 className="text-lg font-bold text-purple-200">Now Playing</h3>
      </div>

      <div className="mb-6">
        {currentSong ? (
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <Image
                src={currentSong.thumbnail}
                alt={currentSong.title}
                width={400}
                height={225}
                className="relative w-full aspect-video rounded-2xl shadow-2xl object-cover ring-1 ring-white/10"
              />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white line-clamp-2 leading-tight">{currentSong.title}</h4>
              <div className="flex items-center justify-between text-xs text-purple-300">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="text-5xl">🎵</div>
            <p className="text-sm text-purple-300">Add your first song to start</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {currentSong && (
        <div 
          onClick={handleProgressClick}
          className="w-full h-2 bg-white/20 rounded-full mb-4 sm:mb-6 overflow-hidden cursor-pointer hover:h-3 transition-all"
        >
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button
          onClick={skipPrev}
          disabled={!currentSong}
          className="px-3 sm:px-5 py-2 sm:py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg sm:rounded-2xl font-bold text-base sm:text-lg transition-all"
        >
          ⏮️
        </button>

        <button
          onClick={togglePlay}
          disabled={!currentSong}
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full text-2xl sm:text-3xl font-black shadow-2xl transition-all duration-300 flex items-center justify-center disabled:opacity-30 ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-green-500 hover:bg-green-600 hover:scale-110'
          }`}
          title={!currentSong ? "Add a song to the playlist first" : isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <button
          onClick={skipNext}
          disabled={!currentSong}
          className="px-3 sm:px-5 py-2 sm:py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg sm:rounded-2xl font-bold text-base sm:text-lg transition-all"
        >
          ⏭️
        </button>
      </div>
    </div>
  )
}

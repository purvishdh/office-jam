'use client'
import { usePlayer } from '@/hooks/usePlayer'
import type { Group } from '@/lib/types'

const PLAYER_CONTAINER_ID = 'yt-player-container'

export default function Player({ group }: { group: Group | undefined }) {
  const { isPlaying, progress, currentSong, togglePlay, skipNext, skipPrev, seek } = usePlayer(group, PLAYER_CONTAINER_ID)

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    seek(fraction)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/20">
      {/* Hidden IFrame API container — must NOT be display:none */}
      <div
        id={PLAYER_CONTAINER_ID}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />

      <h3 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-center">🎛️ Now Playing</h3>

      <div className="text-center mb-4 sm:mb-6">
        {currentSong ? (
          <>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-lg sm:rounded-xl shadow-2xl mb-2 sm:mb-4 object-cover"
            />
            <p className="text-base sm:text-lg font-semibold truncate max-w-xs mx-auto">{currentSong.title}</p>
          </>
        ) : (
          <p className="text-base sm:text-xl opacity-75">Add first song to start 🎵</p>
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

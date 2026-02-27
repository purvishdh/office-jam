'use client'
import { usePlayer } from '@/hooks/usePlayer'
import type { Group } from '@/lib/types'

const PLAYER_CONTAINER_ID = 'yt-player-container'

export default function Player({ group }: { group: Group | undefined }) {
  const { isPlaying, progress, currentSong, togglePlay, skipNext, skipPrev } = usePlayer(group, PLAYER_CONTAINER_ID)

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
      {/* Hidden IFrame API container — must NOT be display:none */}
      <div
        id={PLAYER_CONTAINER_ID}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />

      <h3 className="text-2xl font-bold mb-6 text-center">🎛️ Now Playing</h3>

      <div className="text-center mb-6">
        {currentSong ? (
          <>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-24 h-24 mx-auto rounded-xl shadow-2xl mb-4 object-cover"
            />
            <p className="text-lg font-semibold truncate max-w-xs mx-auto">{currentSong.title}</p>
          </>
        ) : (
          <p className="text-xl opacity-75">Add first song to start 🎵</p>
        )}
      </div>

      {/* Progress bar */}
      {currentSong && (
        <div className="w-full h-2 bg-white/20 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={skipPrev}
          disabled={!currentSong}
          className="px-5 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl font-bold text-lg transition-all"
        >
          ⏮️
        </button>

        <button
          onClick={togglePlay}
          disabled={!currentSong}
          className={`w-20 h-20 rounded-full text-3xl font-black shadow-2xl transition-all duration-300 flex items-center justify-center disabled:opacity-30 ${
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
          className="px-5 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl font-bold text-lg transition-all"
        >
          ⏭️
        </button>
      </div>
    </div>
  )
}

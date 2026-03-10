"use client";
import Image from "next/image";
import { Play, Pause, SkipBack, SkipForward, Music } from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";
import EmptyState from "@/components/ui/EmptyState";
import type { Group } from "@/lib/types";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface PlayerProps {
  group: Group | undefined
  totalMembers?: number
}

export default function Player({ group, totalMembers = 0 }: PlayerProps) {
  const {
    isPlaying,
    progress,
    duration,
    currentSong,
    togglePlay,
    skipNext,
    skipPrev,
    seek,
  } = usePlayer(group, totalMembers);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    seek(fraction);
  };

  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const currentTime = (Number.isFinite(duration) ? duration : 0) * safeProgress;

  return (
    <div className="bg-surface-200 border border-surface-400 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl shadow-brand-500/10">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-1 w-1 rounded-full bg-brand-400 animate-pulse" />
        <h3 className="text-lg font-bold text-white">Now Playing</h3>
      </div>

      <div className="mb-3">
        {currentSong ? (
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-linear-to-br from-brand-500/20 to-brand-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <Image
                src={currentSong.thumbnail}
                alt={currentSong.title}
                width={400}
                height={225}
                className="relative w-full aspect-video rounded-2xl shadow-2xl object-cover ring-1 ring-surface-400"
              />
            </div>
            <div className="space-y-1 bg-black/25 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <h4 className="text-md font-bold text-white line-clamp-2 leading-tight drop-shadow-sm">
                {currentSong.title}
              </h4>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Music}
            title="No songs queued"
            description="Add your first song to start the party!"
            size="md"
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center mb-4 gap-2 justify-between text-xs text-white/95">
        <span className="font-medium">{formatTime(currentTime)}</span>
        {currentSong && (
          <div className="relative w-full">
            <div
              onClick={handleProgressClick}
              className="relative w-full h-2 bg-white/25 rounded-full overflow-hidden cursor-pointer hover:h-3 transition-all"
            >
              <div
                className={`h-full rounded-full transition-all ${
                  safeProgress > 0.995 ? 'bg-orange-400 animate-pulse' : 'bg-white'
                }`}
                style={{ width: `${safeProgress * 100}%` }}
              />
            </div>
            {safeProgress > 0.95 && safeProgress <= 0.995 && (
              <div className="absolute top-4 right-0 text-[10px] text-orange-300 font-semibold opacity-60">
                Ending Soon
              </div>
            )}
          </div>
        )}
        <span className="font-medium">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-5 sm:gap-4">
        <button
          onClick={skipPrev}
          disabled={!currentSong}
          className="px-3 border-2 sm:px-5 py-2 sm:py-3 bg-surface-300 hover:bg-surface-400 disabled:opacity-30 rounded-lg sm:rounded-2xl font-bold text-base sm:text-lg transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          disabled={!currentSong}
          className={`w-16 h-16 border-2 sm:w-20 sm:h-20 rounded-full text-2xl sm:text-3xl font-black shadow-2xl transition-all duration-300 flex items-center justify-center disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed ${
            isPlaying
              ? "bg-brand-500 hover:bg-brand-600 scale-110"
              : "bg-brand-400 hover:bg-brand-500 hover:scale-110"
          }`}
          title={
            !currentSong
              ? "Add a song to the playlist first"
              : isPlaying
                ? "Pause"
                : "Play"
          }
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={skipNext}
          disabled={!currentSong}
          className="px-3 sm:px-5 border-2 py-2 sm:py-3 bg-surface-300 hover:bg-surface-400 disabled:opacity-30 rounded-lg sm:rounded-2xl font-bold text-base sm:text-lg transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

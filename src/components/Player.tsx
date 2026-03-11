"use client";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Shuffle,
  Repeat,
  Gauge,
  Zap,
} from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";
import { useDJMode } from "@/hooks/useDJMode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import EmptyState from "@/components/ui/EmptyState";
import type { Group } from "@/lib/types";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface PlayerProps {
  group: Group | undefined;
  totalMembers?: number;
  memberName: string;
}

export default function Player({
  group,
  totalMembers = 0,
  memberName,
}: PlayerProps) {
  const queryClient = useQueryClient();

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

  const { isDJ, djName } = useDJMode(group, memberName);

  // Determine if user can control playback
  const canControl = memberName && (!group?.dj_mode || isDJ);

  // Feature mutations
  const toggleShuffleMutation = useMutation({
    mutationFn: async () => {
      if (!group?.id) return;
      const newMode = !group.shuffle_mode;
      const { error } = await supabase
        .from("groups")
        .update({ shuffle_mode: newMode })
        .eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group?.id] });
      toast.success(group?.shuffle_mode ? "Shuffle off" : "Shuffle on");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleLoopMutation = useMutation({
    mutationFn: async () => {
      if (!group?.id) return;
      const newMode = !group.loop_mode;
      const { error } = await supabase
        .from("groups")
        .update({ loop_mode: newMode })
        .eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group?.id] });
      toast.success(group?.loop_mode ? "Loop off" : "Loop on");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setSpeedMutation = useMutation({
    mutationFn: async (speed: number) => {
      if (!group?.id) return;
      const { error } = await supabase
        .from("groups")
        .update({ playback_speed: speed })
        .eq("id", group.id);
      if (error) throw error;
      return speed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setCrossfadeMutation = useMutation({
    mutationFn: async (duration: number) => {
      if (!group?.id) return;
      const { error } = await supabase
        .from("groups")
        .update({ crossfade_duration: duration })
        .eq("id", group.id);
      if (error) throw error;
      return duration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
    <div
      className="bg-surface-200 border border-surface-400 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl shadow-brand-500/10"
      data-tour="player"
    >
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
              <h4 className="text-sm font-bold text-white line-clamp-2 drop-shadow-sm">
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
                  safeProgress > 0.995
                    ? "bg-orange-400 animate-pulse"
                    : "bg-white"
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

      <div
        className="flex items-center justify-center gap-5 sm:gap-4"
        data-tour="player-controls"
      >
        {!memberName ? (
          <div className="text-center py-6 px-4">
            <div className="text-lg sm:text-xl font-semibold text-white/90 mb-1">
              ⏳ Loading...
            </div>
            <div className="text-xs sm:text-sm text-white/60">
              Setting up your session
            </div>
          </div>
        ) : canControl ? (
          <div className="w-full space-y-4">
            {/* Main playback controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => toggleShuffleMutation.mutate()}
                disabled={toggleShuffleMutation.isPending}
                className={`
                  px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                  inline-flex items-center gap-1.5 border
                  ${
                    group?.shuffle_mode
                      ? "bg-brand-400/20 border-brand-400/50 text-brand-300 ring-1 ring-brand-400/30"
                      : "bg-surface-300 border-surface-400 text-white/60 hover:text-white hover:bg-surface-350"
                  }
                  disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed
                `}
                title="Shuffle playlist"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shuffle</span>
              </button>

              <button
                onClick={skipPrev}
                disabled={!currentSong}
                className="px-3 border-2 sm:px-5 py-2 sm:py-3 bg-surface-300 hover:bg-surface-400 disabled:opacity-30 rounded-lg sm:rounded-2xl font-bold text-base sm:text-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Previous song"
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
                title="Next song"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={() => toggleLoopMutation.mutate()}
                disabled={toggleLoopMutation.isPending}
                className={`
                  px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                  inline-flex items-center gap-1.5 border
                  ${
                    group?.loop_mode
                      ? "bg-brand-400/20 border-brand-400/50 text-brand-300 ring-1 ring-brand-400/30"
                      : "bg-surface-300 border-surface-400 text-white/60 hover:text-white hover:bg-surface-350"
                  }
                  disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed
                `}
                title="Loop playlist"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Loop</span>
              </button>
            </div>

            {/* Speed control slider */}
            <div className="space-y-2 px-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/60 inline-flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Speed</span>
                </label>
                <span className="text-xs font-bold text-brand-300 tabular-nums">
                  {group?.playback_speed ?? 1}x
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={group?.playback_speed ?? 1}
                onChange={(e) => setSpeedMutation.mutate(parseFloat(e.target.value))}
                disabled={setSpeedMutation.isPending}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  [&::-webkit-slider-runnable-track]:h-2
                  [&::-webkit-slider-runnable-track]:rounded-lg
                  [&::-webkit-slider-runnable-track]:bg-surface-400
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-brand-400
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:hover:bg-brand-500
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-webkit-slider-thumb]:active:scale-95
                  [&::-webkit-slider-thumb]:mt-0
                  [&::-moz-range-track]:h-2
                  [&::-moz-range-track]:rounded-lg
                  [&::-moz-range-track]:bg-surface-400
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-brand-400
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:transition-all
                  [&::-moz-range-thumb]:hover:bg-brand-500
                  [&::-moz-range-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:active:scale-95
                  [&::-moz-range-progress]:h-2
                  [&::-moz-range-progress]:rounded-lg
                  [&::-moz-range-progress]:bg-brand-400"
                style={{
                  background: `linear-gradient(to right, #610000 0%, #430000 ${((group?.playback_speed ?? 1) - 0.25) / 1.75 * 100}%, rgba(255, 255, 255, 0.15) ${((group?.playback_speed ?? 1) - 0.25) / 1.75 * 100}%, rgba(255, 255, 255, 0.15) 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-white/40 font-medium tabular-nums">
                <span>0.25x</span>
                <span>1x</span>
                <span>2x</span>
              </div>
            </div>

            {/* Crossfade control slider */}
            <div className="space-y-2 px-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/60 inline-flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Crossfade</span>
                </label>
                <span className="text-xs font-bold text-brand-300 tabular-nums">
                  {(group?.crossfade_duration ?? 0) === 0 ? "Off" : `${group?.crossfade_duration}s`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={group?.crossfade_duration ?? 0}
                onChange={(e) => setCrossfadeMutation.mutate(parseInt(e.target.value))}
                disabled={setCrossfadeMutation.isPending}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  [&::-webkit-slider-runnable-track]:h-2
                  [&::-webkit-slider-runnable-track]:rounded-lg
                  [&::-webkit-slider-runnable-track]:bg-surface-400
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-brand-400
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:hover:bg-brand-500
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-webkit-slider-thumb]:active:scale-95
                  [&::-webkit-slider-thumb]:mt-0
                  [&::-moz-range-track]:h-2
                  [&::-moz-range-track]:rounded-lg
                  [&::-moz-range-track]:bg-surface-400
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-brand-400
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:transition-all
                  [&::-moz-range-thumb]:hover:bg-brand-500
                  [&::-moz-range-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:active:scale-95
                  [&::-moz-range-progress]:h-2
                  [&::-moz-range-progress]:rounded-lg
                  [&::-moz-range-progress]:bg-brand-400"
                style={{
                  background: `linear-gradient(to right, #610000 0%, #430000 ${(group?.crossfade_duration ?? 0) / 10 * 100}%, rgba(255, 255, 255, 0.15) ${(group?.crossfade_duration ?? 0) / 10 * 100}%, rgba(255, 255, 255, 0.15) 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-white/40 font-medium tabular-nums">
                <span>Off</span>
                <span>5s</span>
                <span>10s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4">
            <div className="text-lg sm:text-xl font-semibold text-white/90 mb-1">
              🎧 {djName} is controlling playback
            </div>
            <div className="text-xs sm:text-sm text-white/60">
              You can still add songs and vote
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

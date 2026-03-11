"use client";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Music,
  ListMusic,
  ThumbsUp,
  ThumbsDown,
  X,
  Loader2,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
  Check,
  Plus,
  Edit,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import {
  fetchSong,
  fetchPlaylist,
  isPlaylistUrl,
  isInvalidStreamUrl,
} from "@/lib/piped";
import type { Group, Song } from "@/lib/types";
import Image from "next/image";
import { useVoting } from "@/hooks/useVoting";

interface Props {
  group: Group;
  memberName: string;
  totalMembers: number;
}

export default function Playlist({ group, memberName, totalMembers }: Props) {
  const queryClient = useQueryClient();
  const [inputUrl, setInputUrl] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(
    new Set(),
  );
  const songs: Song[] = group.playlist ?? [];

  const { upvoteMutation, downvoteMutation, getVoteStatus } = useVoting(
    group,
    memberName,
    totalMembers,
  );

  // ── all mutations unchanged ──────────────────────────────────────────────
  const addSongMutation = useMutation({
    mutationFn: async (youtubeUrl: string) => {
      const existingVideoIds = new Set(songs.map((s) => s.video_id));
      if (isPlaylistUrl(youtubeUrl)) {
        const fetchedSongs = await fetchPlaylist(youtubeUrl, songs.length);
        const newSongs = fetchedSongs.filter(
          (song) => !existingVideoIds.has(song.video_id),
        );
        const skippedCount = fetchedSongs.length - newSongs.length;
        if (newSongs.length === 0)
          return {
            count: 0,
            skipped: skippedCount,
            isPlaylist: true,
            allDuplicates: true,
          };
        const reindexedSongs = newSongs.map((s, i) => ({
          ...s,
          order: songs.length + i,
        }));
        const { error } = await supabase
          .from("groups")
          .update({ playlist: [...songs, ...reindexedSongs] })
          .eq("id", group.id);
        if (error) throw error;
        return {
          count: newSongs.length,
          skipped: skippedCount,
          isPlaylist: true,
          allDuplicates: false,
        };
      } else {
        const newSong = await fetchSong(youtubeUrl, songs.length);
        if (existingVideoIds.has(newSong.video_id))
          return { count: 0, skipped: 1, isPlaylist: false, isDuplicate: true };
        const { error } = await supabase
          .from("groups")
          .update({ playlist: [...songs, newSong] })
          .eq("id", group.id);
        if (error) throw error;
        return { count: 1, skipped: 0, isPlaylist: false, isDuplicate: false };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      setInputUrl("");
      if (data.isPlaylist) {
        if (data.allDuplicates)
          toast.error(`All ${data.skipped} songs already in playlist`);
        else if (data.skipped > 0)
          toast.success(
            `Added ${data.count} new songs (skipped ${data.skipped} duplicates)`,
          );
        else toast.success(`${data.count} songs added from playlist!`);
      } else {
        if (data.isDuplicate) toast.error("Song already in playlist");
        else toast.success("Song added!");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const newPlaylist = songs
        .filter((s) => s.id !== songId)
        .map((s, i) => ({ ...s, order: i }));
      const removedIndex = songs.findIndex((s) => s.id === songId);
      const currentIndex = group.current_index ?? 0;
      let newCurrentIndex = currentIndex;
      if (removedIndex < currentIndex)
        newCurrentIndex = Math.max(0, currentIndex - 1);
      else if (removedIndex === currentIndex)
        newCurrentIndex = Math.min(currentIndex, newPlaylist.length - 1);
      const updates: Partial<Group> = { playlist: newPlaylist };
      if (removedIndex === currentIndex) {
        updates.current_index = newCurrentIndex;
        updates.playback_started_at =
          newPlaylist.length > 0 ? new Date().toISOString() : null;
        updates.is_playing = newPlaylist.length > 0 ? group.is_playing : false;
      } else if (newCurrentIndex !== currentIndex) {
        updates.current_index = newCurrentIndex;
      }
      const { error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["group", group.id] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const cleanupBadUrlsMutation = useMutation({
    mutationFn: async () => {
      const badSongs: Song[] = [];
      const goodSongs: Song[] = [];
      songs.forEach((song) => {
        if (!song.piped_url || isInvalidStreamUrl(song.piped_url))
          badSongs.push(song);
        else goodSongs.push(song);
      });
      if (badSongs.length === 0) return { removed: 0, songs: badSongs };
      const newPlaylist = goodSongs.map((s, i) => ({ ...s, order: i }));
      const currentIndex = group.current_index ?? 0;
      let newCurrentIndex = currentIndex;
      if (
        songs[currentIndex] &&
        badSongs.some((bad) => bad.id === songs[currentIndex].id)
      ) {
        newCurrentIndex = 0;
      } else {
        const badSongsBeforeCurrent = badSongs.filter(
          (_, i) => i < currentIndex,
        ).length;
        newCurrentIndex = Math.max(0, currentIndex - badSongsBeforeCurrent);
      }
      const { error } = await supabase
        .from("groups")
        .update({
          playlist: newPlaylist,
          current_index: Math.min(newCurrentIndex, newPlaylist.length - 1),
          playback_started_at:
            newPlaylist.length > 0 ? new Date().toISOString() : null,
        })
        .eq("id", group.id);
      if (error) throw error;
      return { removed: badSongs.length, songs: badSongs };
    },
    onSuccess: (data) => {
      if (data.removed > 0)
        queryClient.invalidateQueries({ queryKey: ["group", group.id] });
    },
    onError: (err: Error) =>
      console.error("[Cleanup] Failed to clean bad URLs:", err),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (songIds: string[]) => {
      const newPlaylist = songs
        .filter((s) => !songIds.includes(s.id))
        .map((s, i) => ({ ...s, order: i }));
      const currentIndex = group.current_index ?? 0;
      const currentSongId = songs[currentIndex]?.id;
      const removingCurrentSong = songIds.includes(currentSongId);
      let newCurrentIndex = currentIndex;
      const removedIndices = songIds
        .map((id) => songs.findIndex((s) => s.id === id))
        .filter((i) => i !== -1);
      const removedBeforeCurrent = removedIndices.filter(
        (i) => i < currentIndex,
      ).length;
      if (removingCurrentSong) {
        newCurrentIndex = Math.min(
          currentIndex - removedBeforeCurrent,
          newPlaylist.length - 1,
        );
      } else {
        newCurrentIndex = Math.max(0, currentIndex - removedBeforeCurrent);
      }
      const updates: Partial<Group> = { playlist: newPlaylist };
      if (removingCurrentSong) {
        updates.current_index = newCurrentIndex;
        updates.playback_started_at =
          newPlaylist.length > 0 ? new Date().toISOString() : null;
        updates.is_playing = newPlaylist.length > 0 ? group.is_playing : false;
      } else if (newCurrentIndex !== currentIndex) {
        updates.current_index = newCurrentIndex;
      }
      const { error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", group.id);
      if (error) throw error;
      return songIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      setSelectedSongIds(new Set());
      setIsEditMode(false);
      toast.success(`Removed ${count} song${count > 1 ? "s" : ""}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (songs.length > 0 && !cleanupBadUrlsMutation.isPending) {
      const hasBadUrls = songs.some(
        (song) => !song.piped_url || isInvalidStreamUrl(song.piped_url),
      );
      if (hasBadUrls) cleanupBadUrlsMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  useEffect(() => {
    if (!isEditMode) setSelectedSongIds(new Set());
  }, [isEditMode]);

  const toggleSongSelection = (songId: string) => {
    const newSelection = new Set(selectedSongIds);
    if (newSelection.has(songId)) newSelection.delete(songId);
    else newSelection.add(songId);
    setSelectedSongIds(newSelection);
  };

  const selectAll = () => setSelectedSongIds(new Set(songs.map((s) => s.id)));
  const deselectAll = () => setSelectedSongIds(new Set());
  const handleBulkDelete = () => {
    if (selectedSongIds.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedSongIds));
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newSongs = Array.from(songs);
    const [moved] = newSongs.splice(result.source.index, 1);
    newSongs.splice(result.destination.index, 0, moved);
    await supabase
      .from("groups")
      .update({ playlist: newSongs.map((s, i) => ({ ...s, order: i })) })
      .eq("id", group.id);
    queryClient.invalidateQueries({ queryKey: ["group", group.id] });
  };

  const handleAdd = () => {
    const url = inputUrl.trim();
    if (!url) return;
    addSongMutation.mutate(url);
  };

  // ── derived selection state ──────────────────────────────────────────────
  const allSelected = songs.length > 0 && selectedSongIds.size === songs.length;
  const someSelected = selectedSongIds.size > 0 && !allSelected;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className="bg-surface-200 border border-surface-400 rounded-2xl sm:rounded-3xl p-4 sm:p-8 overflow-hidden"
        data-tour="playlist"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <h2 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 truncate">
            <Music className="w-6 h-6 sm:w-8 sm:h-8" />
            <span>Playlist ({songs.length})</span>
          </h2>

          {songs.length > 0 && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              title={isEditMode ? "Done editing" : "Edit playlist"}
              className={`
                relative h-8 w-8 rounded-md text-xs font-semibold transition-all duration-200
                shrink-0 inline-flex items-center justify-center
                active:scale-95
                ${
                  isEditMode
                    ? "bg-red-500/15 hover:bg-red-500/25 text-red-400 ring-1 ring-red-500/30"
                    : "bg-surface-300 hover:bg-surface-400 text-white/60 hover:text-white"
                }
              `}
            >
              {isEditMode ? (
                <Check className="w-5 h-5" />
              ) : (
                <Edit className="w-5 h-5 text-yellow-300" />
              )}
            </button>
          )}
        </div>

        {/* ── Edit Mode Toolbar ───────────────────────────────────────────── */}
        {isEditMode && songs.length > 0 && (
          <div
            className={`mb-4 sm:mb-5 flex items-center justify-between gap-3 px-1`}
          >
            {/* Left: selection count label */}
            <p className="text-xs text-white/40 font-medium tabular-nums select-none">
              {selectedSongIds.size > 0
                ? `${selectedSongIds.size} of ${songs.length} selected`
                : `${songs.length} songs`}
            </p>

            {/* Right: action cluster */}
            <div className="flex items-center gap-2">
              {/* Bulk delete — slides in when items are selected */}
              <button
                onClick={handleBulkDelete}
                disabled={
                  selectedSongIds.size === 0 || bulkDeleteMutation.isPending
                }
                title={`Delete ${selectedSongIds.size} song${selectedSongIds.size !== 1 ? "s" : ""}`}
                className={`
                  inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-semibold
                  transition-all duration-200
                  disabled:opacity-0 disabled:pointer-events-none disabled:scale-90
                  ${
                    selectedSongIds.size > 0
                      ? "bg-red-500/15 hover:bg-red-500/25 text-red-400 ring-1 ring-red-500/30 scale-100"
                      : "scale-90"
                  }
                `}
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span className="tabular-nums">{selectedSongIds.size}</span>
              </button>
              {/* Divider */}
              <div className="w-px h-5 bg-white/10 hidden sm:block" />

              {/* Select All / None toggle group */}
              <div
                className={`inline-flex items-center rounded-lg overflow-hidden ring-1 ring-white/10 bg-surface-300`}
              >
                {/* "None" — only visible when something is selected */}
                {someSelected && (
                  <button
                    onClick={deselectAll}
                    title="Deselect all"
                    className={`
                    px-3 py-1.5 text-xs font-medium transition-all duration-150
                    inline-flex items-center gap-1.5
                    border-r border-white/10
                    ${
                      someSelected || allSelected
                        ? "text-white/70 hover:text-white hover:bg-white/10 opacity-100 w-auto"
                        : "opacity-0 w-0 px-0 pointer-events-none overflow-hidden"
                    }
                  `}
                  >
                    <Square className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">None</span>
                  </button>
                )}

                {/* "All" */}
                <button
                  onClick={selectAll}
                  title="Select all"
                  className={`
                    px-3 py-1.5 text-xs font-medium transition-all duration-150
                    inline-flex items-center gap-1.5
                    ${
                      allSelected
                        ? "text-brand-400 bg-brand-400/10"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">All</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Song Drop Zone ──────────────────────────────────────────── */}
        <div
          className="border-2 border-dashed border-brand-400/50 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8
            text-center hover:border-brand-400 transition-all duration-200
            bg-brand-500/10 hover:bg-brand-500/15 overflow-hidden"
          data-tour="add-song"
          onDrop={(e) => {
            e.preventDefault();
            const url =
              e.dataTransfer.getData("text/uri-list") ||
              e.dataTransfer.getData("text/plain");
            if (url?.includes("youtube.com")) addSongMutation.mutate(url);
          }}
          onDragOver={(e) => e.preventDefault()}
          onPaste={(e) => {
            const url = e.clipboardData?.getData("text");
            if (url?.includes("youtube.com")) addSongMutation.mutate(url);
          }}
        >
          <p className="text-sm sm:text-base mb-3 sm:mb-4 flex items-center justify-center gap-2 text-white/50">
            <Music className="w-4 h-4" />
            <span>Add YouTube video or playlist</span>
          </p>
          <div className="flex gap-2 max-w-lg mx-auto">
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-surface-400/60 border border-surface-400
                rounded-lg sm:rounded-xl text-white placeholder-white/25 text-sm sm:text-base min-w-0
                focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50
                transition-all duration-150"
              placeholder="Paste YouTube URL..."
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={addSongMutation.isPending}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-400 hover:bg-brand-500
                disabled:opacity-50 border rounded-lg sm:rounded-xl font-bold transition-all duration-150
                text-sm sm:text-base whitespace-nowrap cursor-pointer disabled:cursor-not-allowed
                active:scale-95 shrink-0"
            >
              {addSongMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ── Song List ───────────────────────────────────────────────────── */}
        <Droppable droppableId="playlist">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`
                grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5
                max-h-60 sm:max-h-96 overflow-y-auto
                rounded-lg sm:rounded-2xl pr-0.5 transition-all duration-200
                ${snapshot.isDraggingOver ? "bg-brand-500/10" : "bg-transparent"}
              `}
            >
              {songs.map((song, index) => {
                const isCurrentSong = index === (group.current_index ?? 0);
                const isSelected = selectedSongIds.has(song.id);

                return (
                  <Draggable
                    key={song.id}
                    draggableId={song.id}
                    index={index}
                    isDragDisabled={isEditMode}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        onClick={
                          isEditMode
                            ? () => toggleSongSelection(song.id)
                            : undefined
                        }
                        className={`
                          group relative p-2 sm:p-3 rounded-xl border transition-all duration-150
                          flex items-center gap-2 sm:gap-3 overflow-hidden
                          ${isEditMode ? "cursor-pointer select-none" : "cursor-grab active:cursor-grabbing"}
                          ${
                            snapshot.isDragging
                              ? "shadow-2xl scale-[1.02] bg-surface-100 border-brand-400/60 z-50"
                              : isSelected
                                ? "bg-brand-400/15 border-brand-400/50 shadow-[0_0_0_1px_rgba(var(--color-brand-400),0.3)]"
                                : isCurrentSong
                                  ? "bg-brand-400/10 border-brand-400/40"
                                  : "bg-surface-300 hover:bg-surface-350 border-surface-400/60 hover:border-surface-300"
                          }
                        `}
                      >
                        {/* Now-playing bar (left edge accent) */}
                        {isCurrentSong && !isEditMode && (
                          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-brand-400" />
                        )}

                        {/* Warning indicator (top-right corner) */}
                        {!isEditMode &&
                          (() => {
                            const voteStatus = getVoteStatus(song);
                            return (
                              !voteStatus.willBeRemoved && (
                                <div
                                  className="absolute -top-1 -right-1 inline-flex items-center gap-1 rounded-md p-1 animate-pulse"
                                  title="Next downvote will remove this song"
                                >
                                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                </div>
                              )
                            );
                          })()}

                        {/* Checkbox (edit mode) */}
                        {isEditMode && (
                          <span
                            className={`
                              shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-150
                              inline-flex items-center justify-center
                              ${
                                isSelected
                                  ? "bg-brand-400 border-brand-400"
                                  : "border-white/25 bg-transparent group-hover:border-white/50"
                              }
                            `}
                          >
                            {isSelected && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={3}
                              />
                            )}
                          </span>
                        )}

                        {/* Track number (normal mode) */}
                        {!isEditMode && (
                          <span className="text-sm font-bold shrink-0 w-4 text-center text-white group-hover:text-brand-400 transition-colors tabular-nums">
                            {index + 1}
                          </span>
                        )}
                        {/* Thumbnail */}
                        <div className="relative shrink-0">
                          <Image
                            src={song.thumbnail}
                            alt={song.title}
                            width={48}
                            height={48}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shadow-md"
                          />
                          {isCurrentSong && !isEditMode && (
                            <span className="absolute inset-0 rounded-lg ring" />
                          )}
                        </div>

                        {/* Title + duration */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="overflow-hidden">
                            {song.title.length > 28 ? (
                              // Seamless looping marquee — two copies side by side
                              <div className="flex w-max">
                                <p
                                  className={`
            text-xs sm:text-sm font-semibold leading-tight whitespace-nowrap pr-12
            ${isCurrentSong ? "text-brand-300" : "text-white"}
          `}
                                  style={{
                                    animation:
                                      "song-marquee 10s linear infinite",
                                  }}
                                >
                                  {song.title}
                                </p>
                                {/* aria-hidden clone for seamless loop */}
                                <p
                                  aria-hidden
                                  className={`
            text-xs sm:text-sm font-semibold leading-tight whitespace-nowrap pr-12
            ${isCurrentSong ? "text-brand-300" : "text-white"}
          `}
                                  style={{
                                    animation:
                                      "song-marquee 18s ease-in-out infinite",
                                  }}
                                >
                                  {song.title}
                                </p>
                              </div>
                            ) : (
                              <p
                                className={`
        text-xs sm:text-sm font-semibold leading-tight truncate
        ${isCurrentSong ? "text-brand-300" : "text-white"}
      `}
                              >
                                {song.title}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-white/35 mt-0.5 tabular-nums">
                            {Math.floor(song.duration / 60)}:
                            {String(song.duration % 60).padStart(2, "0")}
                          </p>
                        </div>

                        {/* Vote + remove actions (normal mode) */}
                        {!isEditMode && (
                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            {(() => {
                              const voteStatus = getVoteStatus(song);
                              return (
                                <>
                                  {/* ── Upvote ── */}
                                  <button
                                    onClick={() =>
                                      upvoteMutation.mutate(song.id)
                                    }
                                    disabled={upvoteMutation.isPending}
                                    data-tour={
                                      index === 0 ? "voting" : undefined
                                    }
                                    title={`${voteStatus.upvoteCount} upvote${voteStatus.upvoteCount !== 1 ? "s" : ""}`}
                                    className={`
    group/btn h-8 rounded-lg
    inline-flex items-center gap-1
    text-xs font-semibold tabular-nums
    transition-all duration-150 active:scale-90
    disabled:pointer-events-none disabled:opacity-40
    ${
      voteStatus.hasUpvoted
        ? "bg-brand-400/15 text-brand-300 hover:bg-brand-400/25"
        : "text-white/40 hover:text-brand-300 hover:bg-brand-400/10"
    }
  `}
                                  >
                                    <ThumbsUp
                                      className="w-5 h-5 transition-all duration-150 group-hover/btn:scale-110"
                                      fill={
                                        voteStatus.hasUpvoted
                                          ? "currentColor"
                                          : "none"
                                      }
                                      strokeWidth={
                                        voteStatus.hasUpvoted ? 0 : 1.75
                                      }
                                    />
                                    {voteStatus.upvoteCount > 0 && (
                                      <span>{voteStatus.upvoteCount}</span>
                                    )}
                                  </button>
                                  <span className="w-0.5 h-5 bg-white/30 mx-1" />
                                  {/* ── Downvote ── */}
                                  <button
                                    onClick={() =>
                                      downvoteMutation.mutate(song.id)
                                    }
                                    disabled={downvoteMutation.isPending}
                                    title={`${voteStatus.downvoteCount} downvote${voteStatus.downvoteCount !== 1 ? "s" : ""}`}
                                    className={`
    group/btn h-8 rounded-lg
    inline-flex items-center gap-1
    text-xs font-semibold tabular-nums
    transition-all duration-150 active:scale-90
    disabled:pointer-events-none disabled:opacity-40
    ${
      voteStatus.hasDownvoted
        ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
        : "text-white/40 hover:text-red-400 hover:bg-red-500/10"
    }
  `}
                                  >
                                    <ThumbsDown
                                      className="w-5 h-5 transition-all duration-150 group-hover/btn:scale-110"
                                      fill={
                                        voteStatus.hasDownvoted
                                          ? "currentColor"
                                          : "none"
                                      }
                                      strokeWidth={
                                        voteStatus.hasDownvoted ? 0 : 1.75
                                      }
                                    />
                                    {voteStatus.downvoteCount > 0 && (
                                      <span>{voteStatus.downvoteCount}</span>
                                    )}
                                  </button>
                                </>
                              );
                            })()}
                            {/* ── Divider ─────────────────────────────────────────── */}
                            <span className="w-0.5 h-5 bg-white/30 mx-1" />
                            <button
                              onClick={() => removeSongMutation.mutate(song.id)}
                              className="px-1.5 py-1 sm:py-1 bg-red-500/40 hover:bg-red-500/70 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all shrink-0 inline-flex items-center justify-center cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}

              {provided.placeholder}

              {songs.length === 0 && (
                <EmptyState
                  icon={ListMusic}
                  title="Queue is empty"
                  description="Add a song to get the party started!"
                  size="md"
                  className="py-8"
                />
              )}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

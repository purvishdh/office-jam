"use client";
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Group, Song } from "@/lib/types";
import toast from "react-hot-toast";

/**
 * Calculate if a song should be removed based on majority downvotes
 * @param song - The song to check
 * @param totalMembers - Total number of active members in the group
 * @returns true if majority (>50%) voted thumbs down
 */
export function shouldRemoveSong(song: Song, totalMembers: number): boolean {
  if (totalMembers === 0) return false;

  const downvoteCount = song.downvotes?.length ?? 0;
  const majority = totalMembers / 2;

  // Require strict majority (>50%, not ≥50%)
  return downvoteCount > majority;
}

/**
 * Hook for managing song voting with automatic removal on majority downvotes
 */
export function useVoting(
  group: Group,
  memberName: string,
  totalMembers: number,
) {
  const queryClient = useQueryClient();
  const songs: Song[] = group.playlist ?? [];

  /**
   * Toggle upvote for a song
   */
  const upvoteMutation = useMutation({
    mutationFn: async (songId: string) => {
      const song = songs.find((s) => s.id === songId);
      if (!song) throw new Error("Song not found");

      // Initialize vote arrays if they don't exist (backwards compatibility)
      const upvotes = song.upvotes ?? [];
      const downvotes = song.downvotes ?? [];

      // Toggle upvote
      const hasUpvoted = upvotes.includes(memberName);
      const newUpvotes = hasUpvoted
        ? upvotes.filter((name) => name !== memberName)
        : [...upvotes, memberName];

      // Remove from downvotes if present
      const newDownvotes = downvotes.filter((name) => name !== memberName);

      const newPlaylist = songs.map((s) =>
        s.id === songId
          ? { ...s, upvotes: newUpvotes, downvotes: newDownvotes }
          : s,
      );

      const { error } = await supabase
        .from("groups")
        .update({ playlist: newPlaylist })
        .eq("id", group.id);

      if (error) throw error;

      return { hasUpvoted };
    },
    onSuccess: ({ hasUpvoted }) => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      if (!hasUpvoted) {
        toast.success("👍 Upvoted!");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /**
   * Toggle downvote for a song with automatic removal on majority
   */
  const downvoteMutation = useMutation({
    mutationFn: async (songId: string) => {
      const song = songs.find((s) => s.id === songId);
      if (!song) throw new Error("Song not found");

      // Initialize vote arrays if they don't exist (backwards compatibility)
      const upvotes = song.upvotes ?? [];
      const downvotes = song.downvotes ?? [];

      // Toggle downvote
      const hasDownvoted = downvotes.includes(memberName);
      const newDownvotes = hasDownvoted
        ? downvotes.filter((name) => name !== memberName)
        : [...downvotes, memberName];

      // Remove from upvotes if present
      const newUpvotes = upvotes.filter((name) => name !== memberName);

      // Create updated song
      const updatedSong = {
        ...song,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
      };

      // Check if song should be removed (majority downvotes)
      const shouldRemove = shouldRemoveSong(updatedSong, totalMembers);

      let newPlaylist: Song[];
      let removedSong = false;

      if (shouldRemove) {
        // Remove song from playlist and reindex
        newPlaylist = songs
          .filter((s) => s.id !== songId)
          .map((s, i) => ({ ...s, order: i }));
        removedSong = true;
      } else {
        // Just update the vote counts
        newPlaylist = songs.map((s) => (s.id === songId ? updatedSong : s));
      }

      // Adjust current_index if needed when removing
      let newCurrentIndex = group.current_index ?? 0;
      if (removedSong) {
        const removedIndex = songs.findIndex((s) => s.id === songId);
        if (removedIndex < newCurrentIndex) {
          // Song removed before current song, decrement index
          newCurrentIndex = Math.max(0, newCurrentIndex - 1);
        } else if (removedIndex === newCurrentIndex) {
          // Currently playing song was removed, stay at same index (next song)
          newCurrentIndex = Math.min(newCurrentIndex, newPlaylist.length - 1);
        }
      }

      const updates: Partial<Group> = {
        playlist: newPlaylist,
      };

      // Update current_index if it changed
      if (removedSong && newCurrentIndex !== group.current_index) {
        updates.current_index = newCurrentIndex;
        // If currently playing song was removed, restart playback timestamp
        if (songs.findIndex((s) => s.id === songId) === group.current_index) {
          updates.playback_started_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", group.id);

      if (error) throw error;

      return { hasDownvoted, removedSong, songTitle: song.title };
    },
    onSuccess: ({ hasDownvoted, removedSong, songTitle }) => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      if (removedSong) {
        toast.success(`🗑️ "${songTitle}" removed (majority downvoted)`);
      } else if (!hasDownvoted) {
        toast.success("👎 Downvoted");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /**
   * Get vote status for a song
   */
  const getVoteStatus = useCallback(
    (song: Song) => {
      const upvotes = song.upvotes ?? [];
      const downvotes = song.downvotes ?? [];

      return {
        upvoteCount: upvotes.length,
        downvoteCount: downvotes.length,
        hasUpvoted: upvotes.includes(memberName),
        hasDownvoted: downvotes.includes(memberName),
        netVotes: upvotes.length - downvotes.length,
        willBeRemoved: shouldRemoveSong(song, totalMembers),
      };
    },
    [memberName, totalMembers],
  );

  return {
    upvoteMutation,
    downvoteMutation,
    getVoteStatus,
  };
}

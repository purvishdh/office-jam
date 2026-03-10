'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Music, ListMusic, ThumbsUp, ThumbsDown, X, Loader2, AlertTriangle } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { fetchSong, fetchPlaylist, isPlaylistUrl } from '@/lib/piped'
import type { Group, Song } from '@/lib/types'
import Image from 'next/image'
import { useVoting } from '@/hooks/useVoting'

interface Props {
  group: Group
  memberName: string
  totalMembers: number
}

export default function Playlist({ group, memberName, totalMembers }: Props) {
  const queryClient = useQueryClient()
  const [inputUrl, setInputUrl] = useState('')
  const songs: Song[] = group.playlist ?? []
  
  const { upvoteMutation, downvoteMutation, getVoteStatus } = useVoting(group, memberName, totalMembers)

  const addSongMutation = useMutation({
    mutationFn: async (youtubeUrl: string) => {
      // Check if it's a playlist or single video
      if (isPlaylistUrl(youtubeUrl)) {
        const newSongs = await fetchPlaylist(youtubeUrl, songs.length)
        const { error } = await supabase
          .from('groups')
          .update({ playlist: [...songs, ...newSongs] })
          .eq('id', group.id)
        if (error) throw error
        return { count: newSongs.length, isPlaylist: true }
      } else {
        const newSong = await fetchSong(youtubeUrl, songs.length)
        const { error } = await supabase
          .from('groups')
          .update({ playlist: [...songs, newSong] })
          .eq('id', group.id)
        if (error) throw error
        return { count: 1, isPlaylist: false }
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group', group.id] })
      setInputUrl('')
      if (data.isPlaylist) {
        toast.success(`${data.count} songs added from playlist!`)
      } else {
        toast.success('Song added!')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const newPlaylist = songs
        .filter((s) => s.id !== songId)
        .map((s, i) => ({ ...s, order: i }))
      
      // Adjust current_index if needed
      const removedIndex = songs.findIndex(s => s.id === songId)
      const currentIndex = group.current_index ?? 0
      let newCurrentIndex = currentIndex
      
      if (removedIndex < currentIndex) {
        newCurrentIndex = Math.max(0, currentIndex - 1)
      } else if (removedIndex === currentIndex) {
        newCurrentIndex = Math.min(currentIndex, newPlaylist.length - 1)
      }
      
      const updates: Partial<Group> = { playlist: newPlaylist }
      
      // Always reset playback when removing currently playing song
      if (removedIndex === currentIndex) {
        updates.current_index = newCurrentIndex
        updates.playback_started_at = newPlaylist.length > 0 ? new Date().toISOString() : null
        updates.is_playing = newPlaylist.length > 0 ? group.is_playing : false
      } else if (newCurrentIndex !== currentIndex) {
        updates.current_index = newCurrentIndex
      }
      
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', group.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', group.id] }),
    onError: (err: Error) => toast.error(err.message),
  })

  // Remove old voteMutation - now handled by useVoting hook

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newSongs = Array.from(songs)
    const [moved] = newSongs.splice(result.source.index, 1)
    newSongs.splice(result.destination.index, 0, moved)
    await supabase
      .from('groups')
      .update({ playlist: newSongs.map((s, i) => ({ ...s, order: i })) })
      .eq('id', group.id)
    queryClient.invalidateQueries({ queryKey: ['group', group.id] })
  }

  const handleAdd = () => {
    const url = inputUrl.trim()
    if (!url) return
    addSongMutation.mutate(url)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="bg-surface-200 border border-surface-400 rounded-2xl sm:rounded-3xl p-4 sm:p-8 overflow-hidden">
        <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-8 flex items-center gap-2 sm:gap-3 truncate">
          <Music className="w-6 h-6 sm:w-8 sm:h-8" />
          <span>Playlist ({songs.length})</span>
        </h2>

        <div
          className="border-4 border-dashed border-brand-400 rounded-lg sm:rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8 text-center hover:border-brand-300 transition-all bg-brand-500/20 overflow-hidden"
          onDrop={(e) => {
            e.preventDefault()
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
            if (url?.includes('youtube.com')) addSongMutation.mutate(url)
          }}
          onDragOver={(e) => e.preventDefault()}
          onPaste={(e) => {
            const url = e.clipboardData?.getData('text')
            if (url?.includes('youtube.com')) addSongMutation.mutate(url)
          }}
        >
          <p className="text-sm sm:text-xl mb-3 sm:mb-4 flex items-center justify-center gap-2">
            <Music className="w-5 h-5" />
            <span>Add YouTube video or playlist</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 p-2 sm:p-3 bg-surface-500 border border-surface-400 rounded-lg sm:rounded-xl text-white placeholder-muted-400 text-sm sm:text-base min-w-0"
              placeholder="Video: youtube.com/watch?v=... or Playlist: youtube.com/playlist?list=..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={addSongMutation.isPending}
              className="px-3 border w-full max-w-25 mx-auto sm:px-5 py-2 sm:py-3 bg-brand-400 hover:bg-brand-500 disabled:opacity-50 rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              {addSongMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin text-center mx-auto" /> : 'Add'}
            </button>
          </div>
        </div>

        <Droppable droppableId="playlist">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 sm:space-y-4 max-h-60 sm:max-h-96 overflow-y-auto p-2 rounded-lg sm:rounded-2xl transition-all ${
                snapshot.isDraggingOver ? 'bg-brand-500/20' : 'bg-transparent'
              }`}
            >
              {songs.map((song, index) => (
                <Draggable key={song.id} draggableId={song.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={provided.draggableProps.style}
                      className={`p-2 sm:p-4 rounded-lg sm:rounded-2xl border transition-all flex items-center gap-2 sm:gap-4 cursor-grab active:cursor-grabbing overflow-hidden ${
                        index === (group.current_index ?? 0)
                          ? 'border-brand-400/60 bg-brand-400/10'
                          : snapshot.isDragging
                          ? 'shadow-2xl scale-105 bg-brand-500'
                          : 'bg-surface-300 hover:bg-surface-400 border-surface-400 hover:border-brand-400/40'
                      }`}
                    >
                      <span className="text-lg sm:text-xl font-black shrink-0 w-6 sm:w-8 text-brand-400">{index + 1}</span>
                      <Image
                        src={song.thumbnail}
                        alt={song.title}
                        width={56}
                        height={56}
                        className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover shadow-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm sm:text-base font-semibold truncate">{song.title}</p>
                        <p className="text-xs sm:text-sm opacity-60">{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {(() => {
                          const voteStatus = getVoteStatus(song)
                          return (
                            <>
                              <button
                                onClick={() => upvoteMutation.mutate(song.id)}
                                disabled={upvoteMutation.isPending}
                                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                                  voteStatus.hasUpvoted 
                                    ? 'bg-brand-500 ring-2 ring-brand-400' 
                                    : 'bg-brand-400 hover:bg-brand-500'
                                }`}
                                title={`${voteStatus.upvoteCount} upvote${voteStatus.upvoteCount !== 1 ? 's' : ''}`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                {voteStatus.upvoteCount}
                              </button>
                              <button
                                onClick={() => downvoteMutation.mutate(song.id)}
                                disabled={downvoteMutation.isPending}
                                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                                  voteStatus.hasDownvoted 
                                    ? 'bg-red-600 ring-2 ring-red-500' 
                                    : 'bg-red-500/60 hover:bg-red-500'
                                }`}
                                title={`${voteStatus.downvoteCount} downvote${voteStatus.downvoteCount !== 1 ? 's' : ''}`}
                              >
                                <ThumbsDown className="w-4 h-4" />
                                {voteStatus.downvoteCount}
                              </button>
                              {voteStatus.willBeRemoved && (
                                <div className="px-2 py-1 bg-yellow-500/80 rounded-lg inline-flex items-center gap-1" title="Next downvote will remove this song">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                              )}
                            </>
                          )
                        })()}
                        <button
                          onClick={() => removeSongMutation.mutate(song.id)}
                          className="px-2 sm:px-3 py-2 sm:py-2.5 bg-red-500/40 hover:bg-red-500/70 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all shrink-0 inline-flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
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
  )
}

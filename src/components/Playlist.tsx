'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { fetchSong } from '@/lib/piped'
import type { Group, Song } from '@/lib/types'
import Image from 'next/image'

interface Props {
  group: Group
}

export default function Playlist({ group }: Props) {
  const queryClient = useQueryClient()
  const [inputUrl, setInputUrl] = useState('')
  const songs: Song[] = group.playlist ?? []

  const addSongMutation = useMutation({
    mutationFn: async (youtubeUrl: string) => {
      const newSong = await fetchSong(youtubeUrl, songs.length)
      const { error } = await supabase
        .from('groups')
        .update({ playlist: [...songs, newSong] })
        .eq('id', group.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', group.id] })
      setInputUrl('')
      toast.success('Song added!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const newPlaylist = songs
        .filter((s) => s.id !== songId)
        .map((s, i) => ({ ...s, order: i }))
      const { error } = await supabase
        .from('groups')
        .update({ playlist: newPlaylist })
        .eq('id', group.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', group.id] }),
    onError: (err: Error) => toast.error(err.message),
  })

  const voteMutation = useMutation({
    mutationFn: async (songId: string) => {
      const newPlaylist = songs.map((s) =>
        s.id === songId ? { ...s, votes: s.votes + 1 } : s
      )
      const { error } = await supabase
        .from('groups')
        .update({ playlist: newPlaylist })
        .eq('id', group.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', group.id] }),
  })

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
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/20 overflow-hidden">
        <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-8 flex items-center gap-2 sm:gap-3 truncate">
          🎧 Playlist ({songs.length})
        </h2>

        <div
          className="border-4 border-dashed border-purple-400 rounded-lg sm:rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8 text-center hover:border-purple-300 transition-all bg-purple-500/20 overflow-hidden"
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
          <p className="text-sm sm:text-xl mb-3 sm:mb-4">🎵 Drag YouTube links here or paste</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl text-white placeholder-white/50 text-sm sm:text-base min-w-0"
              placeholder="https://youtube.com/watch?v=..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={addSongMutation.isPending}
              className="px-4 sm:px-5 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap"
            >
              {addSongMutation.isPending ? '…' : 'Add'}
            </button>
          </div>
        </div>

        <Droppable droppableId="playlist">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 sm:space-y-4 max-h-60 sm:max-h-96 overflow-y-auto p-2 rounded-lg sm:rounded-2xl transition-all ${
                snapshot.isDraggingOver ? 'bg-purple-500/20' : 'bg-transparent'
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
                          ? 'border-yellow-400/60 bg-yellow-500/10'
                          : snapshot.isDragging
                          ? 'shadow-2xl scale-105 bg-violet-700'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg sm:text-xl font-black flex-shrink-0 w-6 sm:w-8 text-purple-400">{index + 1}</span>
                      <Image
                        src={song.thumbnail}
                        alt={song.title}
                        width={56}
                        height={56}
                        className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover shadow-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm sm:text-base font-semibold truncate">{song.title}</p>
                        <p className="text-xs sm:text-sm opacity-60">{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => voteMutation.mutate(song.id)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap"
                        >
                          👍 {song.votes}
                        </button>
                        <button
                          onClick={() => removeSongMutation.mutate(song.id)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/40 hover:bg-red-500/70 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {songs.length === 0 && (
                <p className="text-center opacity-50 py-8">Queue is empty — add a song!</p>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  )
}

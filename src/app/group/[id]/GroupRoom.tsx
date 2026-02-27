'use client'
import { useEffect, useState } from 'react'
import { useGroup } from '@/hooks/useGroup'
import { useMembers } from '@/hooks/useMembers'
import Playlist from '@/components/Playlist'
import Player from '@/components/Player'
import QRCodeComponent from '@/components/QRCode'
import MemberList from '@/components/MemberList'

interface Props {
  groupId: string
  nameParam: string | undefined
}

export default function GroupRoom({ groupId, nameParam }: Props) {
  const [memberName, setMemberName] = useState('')

  useEffect(() => {
    const fromUrl = nameParam?.trim()
    const fromStorage = localStorage.getItem('jukebox-name') ?? ''
    const resolved = fromUrl || fromStorage || 'Guest'
    setMemberName(resolved)
    if (resolved !== 'Guest') localStorage.setItem('jukebox-name', resolved)
  }, [nameParam])

  const { data: group, isLoading } = useGroup(groupId)
  const members = useMembers(groupId, memberName)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <p className="text-2xl animate-pulse">Loading party…</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <p className="text-2xl opacity-70">Party not found 😢</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-full lg:max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-black text-white break-words flex-1 min-w-0">
            🎵 {group.name}
          </h1>
          <span className="text-xs sm:text-sm opacity-60 whitespace-nowrap">Hi, {memberName}!</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 w-full">
          <div className="lg:col-span-2 space-y-3 sm:space-y-6 min-w-0">
            <Playlist group={group} />
          </div>
          <div className="space-y-3 sm:space-y-6 min-w-0">
            <Player group={group} />
            <MemberList members={members} />
            <QRCodeComponent groupId={groupId} />
          </div>
        </div>
      </div>
    </div>
  )
}

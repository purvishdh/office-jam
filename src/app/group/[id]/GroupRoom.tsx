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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black text-white">
            🎵 {group.name}
          </h1>
          <span className="text-sm opacity-60">Hi, {memberName}!</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Playlist group={group} />
          </div>
          <div className="space-y-6">
            <Player group={group} />
            <MemberList members={members} />
            <QRCodeComponent groupId={groupId} />
          </div>
        </div>
      </div>
    </div>
  )
}

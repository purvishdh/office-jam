'use client'
import { useEffect, useState } from 'react'
import { useGroup } from '@/hooks/useGroup'
import { useMembers } from '@/hooks/useMembers'
import Playlist from '@/components/Playlist'
import Player from '@/components/Player'
import QRCodeComponent from '@/components/QRCode'
import MemberList from '@/components/MemberList'
import NameInput from '@/components/NameInput'
import Loading from '@/components/ui/Loading'
import EmptyState from '@/components/ui/EmptyState'
import { AlertCircle, Music } from 'lucide-react'

interface Props {
  groupId: string
  nameParam: string | undefined
}

export default function GroupRoom({ groupId, nameParam }: Props) {
  const [memberName, setMemberName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)

  useEffect(() => {
    const fromUrl = nameParam?.trim()
    const fromStorage = localStorage.getItem('jukebox-name') ?? ''
    
    if (fromUrl) {
      // Name provided via URL
      setMemberName(fromUrl)
      localStorage.setItem('jukebox-name', fromUrl)
    } else if (fromStorage && fromStorage !== 'Guest') {
      // Valid name from previous session
      setMemberName(fromStorage)
    } else {
      // No name set, show input modal
      setShowNameInput(true)
    }
  }, [nameParam])

  const handleSetName = (name: string) => {
    setMemberName(name)
    localStorage.setItem('jukebox-name', name)
    setShowNameInput(false)
  }

  const { data: group, isLoading } = useGroup(groupId)
  const members = useMembers(groupId, memberName)

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <Loading message="Loading your party..." size="lg" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <EmptyState
          icon={AlertCircle}
          title="Party not found"
          description="This room doesn't exist or has been deleted"
          size="lg"
          className="p-8"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full relative overflow-y-auto transition-colors duration-1000 [&::-webkit-scrollbar]:hidden bg-linear-to-br from-gray-900 via-gray-950 to-black text-white">
      {showNameInput && <NameInput onSetName={handleSetName} />}
      
      {/* Header */}
      <header className="bg-surface-200/80 backdrop-blur-xl border-b border-surface-400 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-brand-400 rounded-xl flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate max-w-xs sm:max-w-md">
                  {group.name}
          </h1>
                <p className="text-sm text-muted-300">
                  {members.length} {members.length === 1 ? 'member' : 'members'} online
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 bg-surface-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-muted-200 font-medium">{memberName}</span>
              </div>
              <button
                onClick={() => setShowNameInput(true)}
                className="p-2 bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors"
                title="Change name"
              >
                <svg className="w-4 h-4 text-muted-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column - Playlist */}
          <div className="xl:col-span-7 space-y-6">
            <Playlist group={group} memberName={memberName} totalMembers={members.length} />
          </div>
          
          {/* Right Column - Player & Sidebar */}
          <div className="xl:col-span-5 space-y-6">
            <Player group={group} totalMembers={members.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
            <MemberList members={members} />
            <QRCodeComponent groupId={groupId} />
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}

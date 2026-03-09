'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PublicGroups from '@/components/NearbyGroups'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('jukebox-name')
    if (saved) setName(saved)
  }, [])

  const createGroup = async () => {
    if (!name.trim()) {
      alert('Please enter your name first')
      return
    }
    
    console.log('🚀 Starting to create group for:', name.trim())
    setCreating(true)
    localStorage.setItem('jukebox-name', name.trim())

    try {
      console.log('📡 Calling Supabase to create group...')
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: `${name.trim()}'s Party`,
        })
        .select('id')
        .single()

      console.log('📡 Supabase response:', { data, error })

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`Failed to create party: ${error.message || 'Unknown error'}`)
        setCreating(false)
        return
      }

      if (!data) {
        console.error('❌ No data returned from Supabase')
        alert('Failed to create party: No data returned')
        setCreating(false)
        return
      }

      console.log('✅ Group created successfully, navigating to:', data.id)
      router.push(`/group/${data.id}?name=${encodeURIComponent(name.trim())}`)
    } catch (err) {
      console.error('❌ Network error:', err)
      setCreating(false)
    }
  }

  const joinGroup = () => {
    if (!name.trim() || !groupId.trim()) return
    localStorage.setItem('jukebox-name', name.trim())
    router.push(`/group/${groupId.trim()}?name=${encodeURIComponent(name.trim())}`)
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 max-w-lg">
        <h1 className="text-4xl sm:text-6xl font-black text-center mb-2 sm:mb-4 text-white">
          🎵
        </h1>
        <p className="text-center text-sm sm:text-base opacity-70 mb-6 sm:mb-12">Collaborative music for your office</p>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/20 space-y-4 sm:space-y-6">
          {/* Name input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 opacity-80">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              placeholder="e.g. Alex"
              className="w-full p-3 sm:p-4 bg-white/20 rounded-lg sm:rounded-xl text-base sm:text-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Create button */}
          <button
            onClick={createGroup}
            disabled={!name.trim() || creating}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-base sm:text-xl px-4 sm:px-8 py-3 sm:py-5 rounded-lg sm:rounded-2xl font-bold shadow-lg hover:scale-105 disabled:hover:scale-100 transition-all duration-300"
          >
            {creating ? 'Creating…' : '🚀 Start Office Music Party'}
          </button>

          {/* OR divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-white/20"></div>
            <div className="relative bg-zinc-900 px-4 text-xs sm:text-sm opacity-60">OR</div>
          </div>

          {/* Join by ID */}
          <div className="space-y-3">
            <label className="block text-xs sm:text-sm font-medium opacity-80">Join existing party</label>
            <input
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinGroup()}
              placeholder="Enter party ID"
              className="w-full p-3 sm:p-4 bg-white/20 rounded-lg sm:rounded-xl text-base sm:text-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={joinGroup}
              disabled={!name.trim() || !groupId.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-base sm:text-lg px-4 py-3 rounded-lg sm:rounded-xl font-semibold transition-all"
            >
              🎉 Join Party
            </button>
          </div>

          {/* Recent groups */}
          <PublicGroups
            onJoin={(id) => {
              if (!name.trim()) return
              localStorage.setItem('jukebox-name', name.trim())
              router.push(`/group/${id}?name=${encodeURIComponent(name.trim())}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

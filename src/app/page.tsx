'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Rocket, PartyPopper } from 'lucide-react'
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
    
    console.log('[Create Group] Starting for:', name.trim())
    setCreating(true)
    localStorage.setItem('jukebox-name', name.trim())

    try {
      console.log('[Create Group] Calling Supabase...')
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: `${name.trim()}'s Party`,
        })
        .select('id')
        .single()

      console.log('[Create Group] Supabase response:', { data, error })

      if (error) {
        console.error('[Create Group] Supabase error details:', {
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
        console.error('[Create Group] No data returned from Supabase')
        alert('Failed to create party: No data returned')
        setCreating(false)
        return
      }

      console.log('[Create Group] Success, navigating to:', data.id)
      router.push(`/group/${data.id}?name=${encodeURIComponent(name.trim())}`)
    } catch (err) {
      console.error('[Create Group] Network error:', err)
      setCreating(false)
    }
  }

  const joinGroup = () => {
    if (!name.trim() || !groupId.trim()) return
    localStorage.setItem('jukebox-name', name.trim())
    router.push(`/group/${groupId.trim()}?name=${encodeURIComponent(name.trim())}`)
  }

  return (
    <div className="min-h-screen w-full relative overflow-y-auto transition-colors duration-1000 [&::-webkit-scrollbar]:hidden bg-linear-to-br from-gray-900 via-gray-950 to-black text-white">
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 max-w-lg">
        <h1 className="text-4xl sm:text-6xl font-black text-center mb-2 sm:mb-4 text-white flex justify-center">
          <Music className="w-10 h-10 sm:w-14 sm:h-14" />
        </h1>
        <p className="text-center text-sm sm:text-base opacity-70 mb-6 sm:mb-12">Collaborative music for your office</p>

        <div className="bg-white/10 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-4 sm:space-y-6 border border-white/20 shadow-2xl">
          {/* Name input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 opacity-80">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              placeholder="e.g. Alex"
              className="w-full p-3 sm:p-4 bg-surface-500 border border-surface-400 rounded-lg sm:rounded-xl text-base sm:text-lg text-white placeholder-muted-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Create button */}
          <button
            onClick={createGroup}
            disabled={!name.trim() || creating}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-xl disabled:bg-white/5 disabled:opacity-50 text-base sm:text-xl px-4 sm:px-8 py-3 sm:py-5 rounded-lg sm:rounded-2xl font-bold shadow-lg hover:scale-105 disabled:hover:scale-100 transition-all duration-300 border border-white/30 inline-flex items-center justify-center gap-2"
          >
            {creating ? 'Creating…' : <><Rocket className="w-4 h-4 sm:w-5 sm:h-5" />Start Office Music Party</>}
          </button>

          {/* OR divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-white/20"></div>
            <div className="relative bg-linear-to-br from-brand-500 via-brand-400/90 to-brand-600 px-4 text-xs sm:text-sm text-white/80">OR</div>
          </div>

          {/* Join by ID */}
          <div className="space-y-3">
            <label className="block text-xs sm:text-sm font-medium opacity-80">Join existing party</label>
            <input
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinGroup()}
              placeholder="Enter party ID"
              className="w-full p-3 sm:p-4 bg-surface-500 border border-surface-400 rounded-lg sm:rounded-xl text-base sm:text-lg text-white placeholder-muted-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              onClick={joinGroup}
              disabled={!name.trim() || !groupId.trim()}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-xl disabled:bg-white/5 disabled:opacity-50 text-base sm:text-lg px-4 py-3 rounded-lg sm:rounded-xl font-semibold transition-all border border-white/30 inline-flex items-center justify-center gap-2"
            >
              <PartyPopper className="w-4 h-4" />
              Join Party
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

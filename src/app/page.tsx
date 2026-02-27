'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useGeolocation } from '@/hooks/useGeolocation'
import NearbyGroups from '@/components/NearbyGroups'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const { lat, lng, loading: geoLoading, requestLocation } = useGeolocation()

  useEffect(() => {
    const saved = localStorage.getItem('jukebox-name')
    if (saved) setName(saved)
  }, [])

  const createGroup = async () => {
    if (!name.trim()) return
    setCreating(true)
    localStorage.setItem('jukebox-name', name.trim())

    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: `${name.trim()}'s Party`,
        lat: lat ?? null,
        lng: lng ?? null,
      })
      .select('id')
      .single()

    if (error || !data) {
      setCreating(false)
      return
    }

    router.push(`/group/${data.id}?name=${encodeURIComponent(name.trim())}`)
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <h1 className="text-6xl font-black text-center mb-4 text-white">
          🎵 Office Jukebox
        </h1>
        <p className="text-center opacity-70 mb-12">Collaborative music for your office</p>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 space-y-6">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              placeholder="e.g. Alex"
              className="w-full p-4 bg-white/20 rounded-xl text-white placeholder-white/50 text-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Location */}
          <div>
            {lat == null ? (
              <button
                onClick={requestLocation}
                disabled={geoLoading}
                className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-xl text-sm transition-all"
              >
                {geoLoading ? '📍 Getting location…' : '📍 Enable location (find nearby parties)'}
              </button>
            ) : (
              <p className="text-sm opacity-70 text-center">
                📍 Location enabled — can find nearby parties
              </p>
            )}
          </div>

          {/* Create button */}
          <button
            onClick={createGroup}
            disabled={!name.trim() || creating}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-xl px-8 py-5 rounded-2xl font-bold shadow-lg hover:scale-105 disabled:hover:scale-100 transition-all duration-300"
          >
            {creating ? 'Creating…' : '🚀 Start Office Music Party'}
          </button>

          {/* Nearby groups */}
          {lat != null && lng != null && (
            <NearbyGroups
              lat={lat}
              lng={lng}
              onJoin={(id) => router.push(`/group/${id}?name=${encodeURIComponent(name.trim())}`)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

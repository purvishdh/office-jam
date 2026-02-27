'use client'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { haversineDistance, PROXIMITY_METERS } from '@/lib/geo'
import type { Group } from '@/lib/types'

interface Props {
  lat: number
  lng: number
  onJoin: (groupId: string) => void
}

export default function NearbyGroups({ lat, lng, onJoin }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['nearby-groups', lat, lng],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, lat, lng, playlist')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      if (error) throw error
      return (data as Group[]).filter(
        (g) => g.lat != null && g.lng != null &&
          haversineDistance(lat, lng, g.lat!, g.lng!) <= PROXIMITY_METERS
      )
    },
    refetchInterval: 10000,
  })

  if (isLoading) return <p className="opacity-60 text-sm">Scanning for nearby parties…</p>

  if (!data?.length) return (
    <p className="opacity-60 text-sm">No parties within {PROXIMITY_METERS}m</p>
  )

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-semibold opacity-80">Nearby parties:</p>
      {data.map((g) => (
        <button
          key={g.id}
          onClick={() => onJoin(g.id)}
          className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-all"
        >
          <span className="font-medium">{g.name}</span>
          <span className="text-sm opacity-60">{g.playlist?.length ?? 0} songs</span>
        </button>
      ))}
    </div>
  )
}

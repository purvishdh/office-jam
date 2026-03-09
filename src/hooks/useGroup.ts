'use client'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Group } from '@/lib/types'

async function fetchGroup(groupId: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()
  if (error) throw error
  return data as Group
}

export function useGroup(groupId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: !!groupId,
  })

  useEffect(() => {
    if (!groupId) return

    console.log('[Realtime] Setting up subscription for group:', groupId)

    const channel = supabase
      .channel(`group-changes:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        (payload) => {
          console.log('[Realtime] Received group update:', payload.new)
          queryClient.setQueryData(['group', groupId], payload.new as Group)
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    return () => { 
      console.log('[Realtime] Removing subscription for group:', groupId)
      supabase.removeChannel(channel) 
    }
  }, [groupId, queryClient])

  return query
}

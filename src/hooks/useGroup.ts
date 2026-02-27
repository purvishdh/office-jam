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

    const channel = supabase
      .channel(`group-changes:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        (payload) => {
          queryClient.setQueryData(['group', groupId], payload.new as Group)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, queryClient])

  return query
}

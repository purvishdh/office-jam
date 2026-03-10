'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Group } from '@/lib/types'

interface UseDJModeReturn {
  isDJ: boolean
  djName: string | null
  toggleDJMode: () => void
  isTogglingDJ: boolean
}

export function useDJMode(
  group: Group | undefined,
  memberName: string
): UseDJModeReturn {
  const queryClient = useQueryClient()
  
  // Check if current member is the DJ
  const isDJ = !!(group?.dj_mode && group?.dj_name === memberName)
  const djName = group?.dj_name ?? null

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!group?.id) throw new Error('No group ID')
      
      const newDJMode = !group.dj_mode
      const { error } = await supabase
        .from('groups')
        .update({
          dj_mode: newDJMode,
          dj_name: newDJMode ? memberName : null,
        })
        .eq('id', group.id)
      
      if (error) throw error
      
      return { djMode: newDJMode, djName: newDJMode ? memberName : null }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group', group?.id] })
      if (data.djMode) {
        toast.success('👑 DJ Mode enabled - You are now the DJ')
      } else {
        toast.success('DJ Mode disabled - Everyone can control playback')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  return {
    isDJ,
    djName,
    toggleDJMode: toggleMutation.mutate,
    isTogglingDJ: toggleMutation.isPending,
  }
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/lib/types'

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#34d399',
  '#60a5fa', '#a78bfa', '#f472b6', '#38bdf8',
]

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

export function useMembers(groupId: string, memberName: string) {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    if (!groupId || !memberName) return

    const me: Member = {
      name: memberName,
      color: randomColor(),
      joined_at: new Date().toISOString(),
    }

    const channel = supabase.channel(`presence:${groupId}`, {
      config: { presence: { key: memberName } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Member>()
        const list = Object.values(state).flatMap((arr) => arr)
        setMembers(list)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(me)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [groupId, memberName])

  return members
}

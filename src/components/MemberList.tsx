'use client'
import { Users, UserPlus } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import type { Member } from '@/lib/types'

export default function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="bg-surface-200 border border-surface-400 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
      <h3 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        <span>Members ({members.length})</span>
      </h3>
      {members.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No members yet"
          description="Waiting for others to join..."
          size="sm"
        />
      ) : (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {members.map((m) => (
            <div key={`${m.name}-${m.joined_at}`} className="flex items-center gap-1 sm:gap-2">
              <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: m.color }}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs sm:text-sm font-medium">{m.name}</span>
              <span className="w-2 h-2 rounded-full bg-red-900 animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

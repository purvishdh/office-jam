'use client'
import type { Member } from '@/lib/types'

export default function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20">
      <h3 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">
        👥 Members ({members.length})
      </h3>
      {members.length === 0 ? (
        <p className="opacity-60 text-xs sm:text-sm">No one else here yet</p>
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
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

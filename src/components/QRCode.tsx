'use client'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

export default function QRCodeComponent({ groupId }: { groupId: string }) {
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/group/${groupId}`
    : `/group/${groupId}`

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/20 text-center overflow-hidden">
      <h3 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">📱 Share with Team</h3>
      <div className="p-2 sm:p-6 bg-white rounded-lg sm:rounded-2xl inline-flex justify-center items-center mb-3 sm:mb-4 w-full sm:w-auto">
        <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center">
          <QRCodeSVG value={joinUrl} size={Math.min(window?.innerWidth || 300, 256)} level="H" includeMargin={true} />
        </div>
      </div>
      <p className="opacity-75 mb-3 sm:mb-4 text-xs sm:text-sm break-words">Anyone can scan to join</p>
      <button
        onClick={() => {
          navigator.clipboard.writeText(joinUrl)
          toast.success('Link copied!')
        }}
        className="bg-blue-500 hover:bg-blue-600 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all w-full text-xs sm:text-base"
      >
        🔗 Copy Link
      </button>
    </div>
  )
}

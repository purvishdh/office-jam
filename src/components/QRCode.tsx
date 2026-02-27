'use client'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

export default function QRCodeComponent({ groupId }: { groupId: string }) {
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/group/${groupId}`
    : `/group/${groupId}`

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center">
      <h3 className="text-2xl font-bold mb-6">📱 Share with Team</h3>
      <div className="p-6 bg-white rounded-2xl inline-block mb-4">
        <QRCodeSVG value={joinUrl} size={180} />
      </div>
      <p className="opacity-75 mb-4 text-sm">Anyone can scan to join</p>
      <button
        onClick={() => {
          navigator.clipboard.writeText(joinUrl)
          toast.success('Link copied!')
        }}
        className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl font-bold transition-all w-full"
      >
        🔗 Copy Link
      </button>
    </div>
  )
}

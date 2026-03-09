"use client";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Copy, Share2, Sparkles, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

export default function QRCodeComponent({ groupId }: { groupId: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/group/${groupId}`
      : `/group/${groupId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setIsCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center overflow-hidden shadow-2xl hover:bg-white/15 transition-all duration-300">
      {/* Decorative glow effects */}
      <div className="pointer-events-none absolute -top-24 -right-20 h-48 w-48 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl" />
      {/* Header */}
      <div className="relative mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-400/20 border border-brand-400/30 mb-3 sm:mb-4 shadow-lg">
          <Share2 className="w-6 h-6 sm:w-7 text-brand-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          Share with Team
        </h3>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <p className="text-muted-400 text-xs sm:text-sm">
            Scan to join the party
          </p>
        </div>
      </div>
      {/* QR Code */}
      <div className="relative mb-6 sm:mb-8 flex justify-center">
        <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-gray-200 inline-block">
          <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <QRCodeSVG
              value={joinUrl}
              size={
                typeof window !== "undefined"
                  ? Math.min(window?.innerWidth * 0.35, 224)
                  : 224
              }
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>
      </div>
      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        disabled={isCopied}
        className="bg-brand-400 hover:bg-brand-500 active:bg-brand-600 disabled:bg-brand-400/70 px-4 sm:px-6 py-3 sm:py-3.5 text-white rounded-xl sm:rounded-2xl font-semibold transition-all duration-200 w-full text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed relative cursor-pointer"
      >
        {isCopied ? (
          <>
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Copy Invite Link</span>
          </>
        )}
      </button>
    </div>
  );
}

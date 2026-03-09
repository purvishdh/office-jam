"use client";
import { useState } from "react";
import { Music, Rocket } from 'lucide-react'

interface Props {
  onSetName: (name: string) => void;
}

export default function NameInput({ onSetName }: Props) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    onSetName(name.trim());
    setIsSubmitting(false);
  };

  const suggestions = [
    'Rockstar', 'Singer', 'MusicLover', 'DJ', 'Pianist',
    'Drummer', 'Musician', 'Violinist', 'Jazzman', 'Melody'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-200 border border-surface-400 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Join the Party!
          </h2>
          <p className="text-muted-300 text-sm">
            Enter your name so others can see who&apos;s jamming
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              className="w-full px-4 py-3 bg-surface-300 border border-surface-400 rounded-xl text-white placeholder-muted-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors"
              maxLength={20}
              autoFocus
            />
            <div className="flex justify-between mt-2">
              <p className="text-xs text-muted-400">
                {name.length}/20 characters
              </p>
              {name.length >= 15 && (
                <p className="text-xs text-orange-400">
                  {20 - name.length} left
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-300 mb-3 font-medium">Quick suggestions:</p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.slice(0, 6).map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className="text-xs px-3 py-2 bg-surface-300 hover:bg-surface-400 border border-surface-400 hover:border-brand-400 rounded-lg text-muted-200 hover:text-white transition-colors text-center cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full bg-brand-400 hover:bg-brand-500 disabled:bg-surface-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining...</span>
                </div>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Rocket className="w-4 h-4" />
                  Join Party
                </span>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => onSetName('Music Fan')}
              className="w-full text-sm text-muted-400 hover:text-muted-200 py-2 transition-colors"
            >
              Skip (use &quot;Music Fan&quot;)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

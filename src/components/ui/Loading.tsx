'use client'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Loading({ 
  message = "Loading...", 
  size = 'md',
  className = "" 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-brand-400 animate-spin`} />
      <p className={`text-muted-300 font-medium ${textSizeClasses[size]}`}>
        {message}
      </p>
    </div>
  )
}
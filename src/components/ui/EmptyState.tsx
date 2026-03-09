'use client'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  iconElement?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function EmptyState({
  icon: Icon,
  iconElement,
  title,
  description,
  action,
  size = 'md',
  className = ""
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-8 h-8',
      title: 'text-base',
      description: 'text-sm'
    },
    md: {
      container: 'py-12',
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-base'
    },
    lg: {
      container: 'py-16',
      icon: 'w-16 h-16', 
      title: 'text-xl',
      description: 'text-lg'
    }
  }

  return (
    <div className={`text-center space-y-4 ${sizeClasses[size].container} ${className}`}>
      {/* Icon */}
      <div className="flex justify-center">
        {iconElement ? (
          iconElement
        ) : Icon ? (
          <Icon className={`${sizeClasses[size].icon} text-muted-400`} />
        ) : (
          <div className={`${sizeClasses[size].icon} bg-surface-300 rounded-full flex items-center justify-center`}>
            <span className="text-lg">?</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className={`font-semibold text-white ${sizeClasses[size].title}`}>
          {title}
        </h3>
        {description && (
          <p className={`text-muted-400 ${sizeClasses[size].description}`}>
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && (
        <div className="pt-2">
          {action}
        </div>
      )}
    </div>
  )
}
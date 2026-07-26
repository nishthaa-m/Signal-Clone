"use client";

import React from 'react';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const dotSizes = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
};

// Generates consistent background colors based on user name
function getColorByName(name: string): string {
  const colors = [
    'bg-blue-600',
    'bg-indigo-600',
    'bg-purple-600',
    'bg-teal-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  src,
  size = 'md',
  isOnline,
  className = '',
}) => {
  const displayName = name || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const bgColor = getColorByName(displayName);

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full object-cover border border-signal-border`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full ${bgColor} text-white font-medium flex items-center justify-center border border-signal-border select-none`}
        >
          {initial}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-signal-sidebar ${
            isOnline ? 'bg-emerald-500' : 'bg-gray-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

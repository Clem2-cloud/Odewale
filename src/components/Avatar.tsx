import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
  const [failed, setFailed] = useState(false);

  const initials = (name || 'OC')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  if (!src || failed) {
    return (
      <div
        aria-label={name}
        className={`${SIZE_MAP[size]} rounded-full flex items-center justify-center font-display font-semibold shrink-0 select-none ${className}`}
        style={{
          backgroundColor: 'var(--oc-accent-soft)',
          color: 'var(--oc-accent)',
          border: '1px solid var(--oc-border)',
        }}
      >
        {initials || 'OC'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${SIZE_MAP[size]} rounded-full object-cover shrink-0 ${className}`}
      style={{ border: '1px solid var(--oc-border)' }}
    />
  );
};

import React from 'react';

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  gray: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
  blue: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  green: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  yellow: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  purple: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  red: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
};

interface AtsBadgeProps {
  children: React.ReactNode;
  color?: string;
}

export const AtsBadge: React.FC<AtsBadgeProps> = ({ children, color = 'gray' }) => {
  const c = colorMap[color] || colorMap.gray;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {children}
    </span>
  );
};

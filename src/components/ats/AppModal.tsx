import React from 'react';
import { Icons } from './Icons';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

export const AppModal: React.FC<AppModalProps> = ({ isOpen, onClose, title, children, width = 640 }) => {
  if (!isOpen) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', animation: 'fadeSlide 0.2s' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-2xl overflow-hidden"
        style={{ width, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {Icons.x}
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

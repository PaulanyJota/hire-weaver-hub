import React from 'react';
import type { Toast } from '@/hooks/useAppToast';

export const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {toasts.map(t => (
      <div
        key={t.id}
        className="px-5 py-3 rounded-xl text-sm font-medium shadow-lg"
        style={{
          background: t.type === 'success' ? '#065F46' : '#991B1B',
          color: '#fff',
          animation: t.exiting ? 'toastOut 0.3s forwards' : 'toastIn 0.3s',
          minWidth: 260,
        }}
      >
        {t.msg}
      </div>
    ))}
  </div>
);

import { useState, useRef, useCallback } from 'react';

export interface Toast {
  id: number;
  msg: string;
  type: string;
  exiting: boolean;
}

export function useAppToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((msg: string, type = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, msg, type, exiting: false }]);
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t)), 2800);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  return { toasts, show };
}

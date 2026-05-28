import { createContext, useContext, useState, ReactNode } from 'react';

interface Ctx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SidebarCtx = createContext<Ctx | null>(null);

export function PortalSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarCtx.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(v => !v),
      }}
    >
      {children}
    </SidebarCtx.Provider>
  );
}

export function usePortalSidebar() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) return { isOpen: false, open: () => {}, close: () => {}, toggle: () => {} };
  return ctx;
}

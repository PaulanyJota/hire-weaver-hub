import { Outlet } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import { PortalSidebarProvider } from '../hooks/usePortalSidebar';
import '../portal.css';

export function PortalLayout() {
  return (
    <PortalSidebarProvider>
      <div className="portal-root min-h-screen flex portal-shell font-sans">
        <PortalSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </PortalSidebarProvider>
  );
}

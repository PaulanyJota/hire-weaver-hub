import { Outlet } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';

export function PortalLayout() {
  return (
    <div className="min-h-screen flex bg-background font-sans">
      <PortalSidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

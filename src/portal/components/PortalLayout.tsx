import { Outlet } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';
import '../portal.css';

export function PortalLayout() {
  return (
    <div className="portal-root min-h-screen flex portal-shell font-sans">
      <PortalSidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

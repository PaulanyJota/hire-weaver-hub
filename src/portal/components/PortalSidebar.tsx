import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, ClipboardCheck, AlertTriangle, Settings, LogOut, Building2 } from 'lucide-react';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { cn } from '@/lib/utils';

const items = [
  { to: '/portal', label: 'Inicio', icon: Home, end: true },
  { to: '/portal/trabajadores', label: 'Trabajadores', icon: Users },
  { to: '/portal/aprobaciones', label: 'Aprobaciones', icon: ClipboardCheck, adminOnly: true },
  { to: '/portal/incidencias', label: 'Incidencias', icon: AlertTriangle },
  { to: '/portal/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
];

export function PortalSidebar() {
  const { profile, company, isAdmin, signOut } = usePortalAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login', { replace: true });
  };

  const initials = (profile?.full_name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="w-64 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#1F4E78] text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">Portal Cliente</p>
            <p className="text-xs text-muted-foreground truncate">{company?.name ?? 'NODO Talentos'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.filter(i => !i.adminOnly || isAdmin).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-[#1F4E78] text-white font-medium'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-[#1F4E78]/10 text-[#1F4E78] flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{profile?.role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, ClipboardCheck, AlertTriangle, Settings, LogOut, Sparkles } from 'lucide-react';
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
    <aside className="portal-sidebar w-64 shrink-0 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-logo" style={{ width: 38, height: 38, borderRadius: 11 }}>
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight text-white truncate tracking-tight">Portal Cliente</p>
            <p className="text-[11px] text-white/55 truncate">{company?.name ?? 'NODO Talentos'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Menú</p>
        {items.filter(i => !i.adminOnly || isAdmin).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
              isActive ? 'active font-semibold' : ''
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, hsl(199 89% 48%), hsl(213 78% 35%))' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-white/55 capitalize">{profile?.role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-xs text-white/65 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

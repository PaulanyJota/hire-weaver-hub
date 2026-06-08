import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Users, AlertTriangle, Settings, LogOut, Clock, ShieldCheck, X, FileText, DollarSign, ClipboardList } from 'lucide-react';
import { NodoWillLogo } from '@/components/NodoWillLogo';
import { supabase } from '@/integrations/supabase/client';

import { usePortalAuth } from '../hooks/usePortalAuth';
import { usePortalSidebar } from '../hooks/usePortalSidebar';
import { cn } from '@/lib/utils';

const items = [
  { to: '/portal', label: 'Inicio', icon: Home, end: true },
  { to: '/portal/trabajadores', label: 'Trabajadores', icon: Users },
  { to: '/portal/asistencia', label: 'Asistencia', icon: Clock },
  { to: '/portal/control-marcaje', label: 'Control de marcaje', icon: ShieldCheck },
  { to: '/portal/contratos', label: 'Contratos', icon: FileText },
  { to: '/portal/comisiones', label: 'Comisiones', icon: DollarSign },
  { to: '/portal/solicitudes', label: 'Solicitudes', icon: ClipboardList, adminOnly: true, badge: 'pending' as const },
  { to: '/portal/incidencias', label: 'Incidencias', icon: AlertTriangle },
  { to: '/portal/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
];

export function PortalSidebar() {
  const { profile, company, isAdmin, signOut } = usePortalAuth();
  const { isOpen, close } = usePortalSidebar();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const load = async () => {
      const { count } = await supabase
        .from('portal_approval_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pendiente', 'en_proceso']);
      if (active) setPendingCount(count ?? 0);
    };
    load();
    const ch = supabase.channel('sidebar-solicitudes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_approval_requests' }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [isAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login', { replace: true });
  };

  const initials = (profile?.full_name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        onClick={close}
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'portal-sidebar w-64 shrink-0 flex flex-col h-screen z-50',
          // Desktop: sticky
          'lg:sticky lg:top-0 lg:translate-x-0',
          // Mobile: fixed drawer
          'fixed top-0 left-0 transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38 }}>
              <NodoWillLogo size={38} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-white truncate tracking-tight">Nodo Will</p>
              <p className="text-[11px] text-white/55 truncate">{company?.name ?? 'NODO Talentos'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Menú</p>
          {items.filter(i => !i.adminOnly || isAdmin).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={close}
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
    </>
  );
}

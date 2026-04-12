import React from 'react';
import { Icons } from './Icons';
import nodoLogo from '@/assets/nodo-logo.jpeg';

interface SidebarProps {
  activeTab: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSwitchTab: (tab: string) => void;
  hasSelectedVacante: boolean;
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { id: 'vacantes', label: 'Vacantes', icon: Icons.briefcase },
  { id: 'pipeline', label: 'Pipeline', icon: Icons.filter },
  { id: 'talentos', label: 'Talentos', icon: Icons.users },
  { id: 'clientes', label: 'Clientes', icon: Icons.building },
  { id: 'entrevistas', label: 'Entrevistas', icon: Icons.calendar },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, collapsed, onToggleCollapse, onSwitchTab, hasSelectedVacante }) => {
  return (
    <aside
      className="flex flex-col h-screen shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 64 : 240,
        background: 'hsl(var(--sidebar-bg))',
        borderRight: '1px solid hsl(var(--sidebar-bg-hover))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5" style={{ minHeight: 64 }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={nodoLogo} alt="Nodo Conectando Talentos" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold text-sm" style={{ color: 'hsl(var(--sidebar-text-hover))' }}>Nodo</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{
            background: 'hsl(var(--sidebar-bg))',
            color: 'hsl(var(--sidebar-text))',
            ...(collapsed ? { margin: '0 auto' } : {}),
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--sidebar-bg))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text))'; }}
        >
          {Icons.collapse}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
        {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'hsl(var(--sidebar-text))' }}>Core Operativo</p>}
        {NAV.map(n => {
          const isActive = activeTab === n.id && !hasSelectedVacante;
          return (
            <button
              key={n.id}
              onClick={() => onSwitchTab(n.id)}
              title={collapsed ? n.label : undefined}
              className="w-full flex items-center rounded-[10px] text-[13px] font-medium transition-all border-none"
              style={{
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'hsl(var(--sidebar-active))' : 'transparent',
                color: isActive ? '#fff' : 'hsl(var(--sidebar-text))',
                fontWeight: isActive ? 600 : 500,
                boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text-hover))'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--sidebar-text))'; } }}
            >
              {n.icon}
              {!collapsed && n.label}
            </button>
          );
        })}

        {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 mt-6" style={{ color: 'hsl(var(--sidebar-text))' }}>Config</p>}
        <button
          onClick={() => onSwitchTab('settings')}
          title={collapsed ? 'Ajustes' : undefined}
          className="w-full flex items-center rounded-[10px] text-[13px] font-medium transition-all border-none"
          style={{
            gap: 12,
            padding: collapsed ? '10px 0' : '10px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: activeTab === 'settings' ? 'hsl(var(--sidebar-active))' : 'transparent',
            color: activeTab === 'settings' ? '#fff' : 'hsl(var(--sidebar-text))',
          }}
          onMouseEnter={e => { if (activeTab !== 'settings') { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text-hover))'; } }}
          onMouseLeave={e => { if (activeTab !== 'settings') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--sidebar-text))'; } }}
        >
          {Icons.settings}
          {!collapsed && 'Ajustes'}
        </button>
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="px-4 py-4 border-t" style={{ borderColor: 'hsl(var(--sidebar-bg-hover))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">AD</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--sidebar-text-hover))' }}>Admin</p>
              <p className="text-[11px]" style={{ color: 'hsl(var(--sidebar-text))' }}>Reclutador Senior</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

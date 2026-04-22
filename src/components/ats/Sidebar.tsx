import React, { useState } from 'react';
import { Icons } from './Icons';
import nodoLogo from '@/assets/nodo-logo.jpeg';

interface SidebarProps {
  activeTab: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSwitchTab: (tab: string) => void;
  hasSelectedVacante: boolean;
}

type NavItem = { id: string; label: string; icon: React.ReactNode; children?: NavItem[] };
type NavGroup = { id: string; label: string; icon: React.ReactNode; items: NavItem[] };

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const dot = <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60" />;

const GROUPS: NavGroup[] = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: Icons.briefcase,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
      { id: 'vacantes', label: 'Vacantes', icon: Icons.briefcase },
      { id: 'pipeline', label: 'Pipeline', icon: Icons.filter },
      { id: 'whatsapp', label: 'WhatsApp', icon: <span className="text-base leading-none">💬</span> },
      { id: 'talentos', label: 'Talentos', icon: Icons.users },
      { id: 'clientes', label: 'Clientes', icon: Icons.building },
      { id: 'entrevistas', label: 'Entrevistas', icon: Icons.calendar },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: Icons.trending,
    items: [
      { id: 'comercial-clientes', label: 'Clientes', icon: Icons.building },
      { id: 'comercial-pipeline', label: 'Pipeline Comercial', icon: Icons.filter },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: Icons.dollar,
    items: [
      {
        id: 'fin-estado-resultados',
        label: 'Estado de resultados',
        icon: Icons.dashboard,
        children: MESES.map((mes, idx) => ({
          id: `fin-er-${idx + 1}`,
          label: mes,
          icon: dot,
        })),
      },
      { id: 'fin-flujo-caja', label: 'Flujo de caja', icon: Icons.trending },
      {
        id: 'fin-financiamiento',
        label: 'Financiamiento',
        icon: Icons.dollar,
        children: [
          { id: 'fin-financiamiento-creditos', label: 'Créditos', icon: dot },
          { id: 'fin-financiamiento-factoring', label: 'Factoring', icon: dot },
          { id: 'fin-financiamiento-deuda-privada', label: 'Deuda Privada', icon: dot },
        ],
      },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: Icons.shield,
    items: [
      { id: 'legal-outsourcing', label: 'Nodo Outsourcing SpA', icon: Icons.building },
      { id: 'legal-est', label: 'Nodo EST SpA', icon: Icons.building },
    ],
  },
];

// Helper: ¿este item (o alguno de sus hijos) está activo?
const itemContainsActive = (item: NavItem, activeTab: string): boolean => {
  if (item.id === activeTab) return true;
  return !!item.children?.some(c => c.id === activeTab);
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, collapsed, onToggleCollapse, onSwitchTab, hasSelectedVacante }) => {
  // Acordeón: solo uno abierto a la vez. Se abre el grupo que contiene activeTab; default Operaciones.
  const initialOpen =
    GROUPS.find(g => g.items.some(i => itemContainsActive(i, activeTab)))?.id ?? 'operaciones';
  const [openGroup, setOpenGroup] = useState<string>(initialOpen);

  // Sub-acordeón dentro de un grupo (ej: Estado de resultados → meses). Solo uno abierto.
  const initialOpenItem =
    GROUPS.flatMap(g => g.items).find(i => i.children?.some(c => c.id === activeTab))?.id ?? '';
  const [openItem, setOpenItem] = useState<string>(initialOpenItem);

  const toggleGroup = (id: string) => {
    setOpenGroup(prev => (prev === id ? '' : id));
  };

  const toggleItem = (id: string) => {
    setOpenItem(prev => (prev === id ? '' : id));
  };

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
      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2 overflow-y-auto">
        {/* Inicio (fuera de grupos) */}
        <button
          onClick={() => onSwitchTab('home')}
          title={collapsed ? 'Inicio' : undefined}
          className="w-full flex items-center rounded-[10px] text-[13px] font-medium transition-all border-none mb-2"
          style={{
            gap: 12,
            padding: collapsed ? '10px 0' : '10px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: activeTab === 'home' ? 'hsl(var(--sidebar-active))' : 'transparent',
            color: activeTab === 'home' ? '#fff' : 'hsl(var(--sidebar-text))',
            fontWeight: 600,
            boxShadow: activeTab === 'home' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (activeTab !== 'home') { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text-hover))'; } }}
          onMouseLeave={e => { if (activeTab !== 'home') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--sidebar-text))'; } }}
        >
          {Icons.dashboard}
          {!collapsed && <span>Inicio</span>}
        </button>

        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'hsl(var(--sidebar-text))' }}>
            Core Operativo
          </p>
        )}

        {GROUPS.map(group => {
          const isOpen = openGroup === group.id;
          const groupContainsActive = group.items.some(i => itemContainsActive(i, activeTab)) && !hasSelectedVacante;

          return (
            <div key={group.id} className="flex flex-col">
              {/* Group header */}
              <button
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setOpenGroup(group.id);
                    return;
                  }
                  toggleGroup(group.id);
                }}
                title={collapsed ? group.label : undefined}
                className="w-full flex items-center rounded-[10px] text-[13px] font-medium transition-all border-none"
                style={{
                  gap: 12,
                  padding: collapsed ? '10px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: groupContainsActive && !isOpen ? 'hsl(var(--sidebar-bg-hover))' : 'transparent',
                  color: groupContainsActive ? 'hsl(var(--sidebar-text-hover))' : 'hsl(var(--sidebar-text))',
                  fontWeight: 600,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text-hover))'; }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = groupContainsActive && !isOpen ? 'hsl(var(--sidebar-bg-hover))' : 'transparent';
                  e.currentTarget.style.color = groupContainsActive ? 'hsl(var(--sidebar-text-hover))' : 'hsl(var(--sidebar-text))';
                }}
              >
                {group.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    <span
                      style={{
                        transition: 'transform 200ms',
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        display: 'inline-flex',
                      }}
                    >
                      {Icons.chevron}
                    </span>
                  </>
                )}
              </button>

              {/* Group items */}
              {!collapsed && isOpen && group.items.length > 0 && (
                <div className="flex flex-col gap-1 mt-1 mb-1 ml-2 pl-3 border-l" style={{ borderColor: 'hsl(var(--sidebar-bg-hover))' }}>
                  {group.items.map(n => {
                    const hasChildren = !!n.children?.length;
                    const itemOpen = openItem === n.id;
                    const containsActive = itemContainsActive(n, activeTab) && !hasSelectedVacante;
                    const isActive = activeTab === n.id && !hasSelectedVacante;

                    return (
                      <div key={n.id} className="flex flex-col">
                        <button
                          onClick={() => {
                            if (hasChildren) {
                              toggleItem(n.id);
                            } else {
                              onSwitchTab(n.id);
                            }
                          }}
                          className="w-full flex items-center rounded-[10px] text-[13px] font-medium transition-all border-none whitespace-nowrap"
                          style={{
                            gap: 10,
                            padding: '8px 10px',
                            justifyContent: 'flex-start',
                            background: isActive ? 'hsl(var(--sidebar-active))' : (containsActive && !itemOpen ? 'hsl(var(--sidebar-bg-hover))' : 'transparent'),
                            color: isActive ? '#fff' : (containsActive ? 'hsl(var(--sidebar-text-hover))' : 'hsl(var(--sidebar-text))'),
                            fontWeight: isActive || containsActive ? 600 : 500,
                            boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                          }}
                          onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text-hover))'; } }}
                          onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = (containsActive && !itemOpen) ? 'hsl(var(--sidebar-bg-hover))' : 'transparent'; e.currentTarget.style.color = containsActive ? 'hsl(var(--sidebar-text-hover))' : 'hsl(var(--sidebar-text))'; } }}
                        >
                          <span className="shrink-0 inline-flex items-center justify-center">{n.icon}</span>
                          <span className="truncate flex-1 text-left">{n.label}</span>
                          {hasChildren && (
                            <span
                              style={{
                                transition: 'transform 200ms',
                                transform: itemOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                display: 'inline-flex',
                                opacity: 0.7,
                              }}
                            >
                              {Icons.chevron}
                            </span>
                          )}
                        </button>

                        {/* Sub-items (nivel 2) */}
                        {hasChildren && itemOpen && (
                          <div className="flex flex-col gap-0.5 mt-1 mb-1 ml-3 pl-3 border-l" style={{ borderColor: 'hsl(var(--sidebar-bg-hover))' }}>
                            {n.children!.map(sub => {
                              const subActive = activeTab === sub.id && !hasSelectedVacante;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => onSwitchTab(sub.id)}
                                  className="w-full flex items-center rounded-[8px] text-[12px] font-medium transition-all border-none whitespace-nowrap"
                                  style={{
                                    gap: 8,
                                    padding: '6px 10px',
                                    justifyContent: 'flex-start',
                                    background: subActive ? 'hsl(var(--sidebar-active))' : 'transparent',
                                    color: subActive ? '#fff' : 'hsl(var(--sidebar-text))',
                                    fontWeight: subActive ? 600 : 500,
                                    boxShadow: subActive ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                                  }}
                                  onMouseEnter={e => { if (!subActive) { e.currentTarget.style.background = 'hsl(var(--sidebar-bg-hover))'; e.currentTarget.style.color = 'hsl(var(--sidebar-text-hover))'; } }}
                                  onMouseLeave={e => { if (!subActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--sidebar-text))'; } }}
                                >
                                  <span className="shrink-0 inline-flex items-center justify-center opacity-70">{sub.icon}</span>
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!collapsed && isOpen && group.items.length === 0 && (
                <div className="ml-2 pl-3 py-2 border-l" style={{ borderColor: 'hsl(var(--sidebar-bg-hover))' }}>
                  <p className="text-[11px] italic px-2" style={{ color: 'hsl(var(--sidebar-text))' }}>
                    Próximamente
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 mt-6" style={{ color: 'hsl(var(--sidebar-text))' }}>
            Config
          </p>
        )}
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

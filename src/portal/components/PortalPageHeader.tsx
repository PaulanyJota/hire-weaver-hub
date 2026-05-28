import { Bell, Menu } from 'lucide-react';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { usePortalSidebar } from '../hooks/usePortalSidebar';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  notifications?: number;
  right?: React.ReactNode;
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function PortalPageHeader({ eyebrow, title, subtitle, notifications = 0, right }: Props) {
  const { profile } = usePortalAuth();
  const { toggle } = usePortalSidebar();
  const initials = getInitials(profile?.full_name);

  return (
    <header
      className="p-fade-up relative overflow-hidden rounded-2xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8 text-white"
      style={{ background: 'linear-gradient(135deg, #0F2440 0%, #3DA5E0 100%)' }}
    >
      <div
        className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, #3DA5E0, transparent)' }}
      />
      <div className="relative flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0 flex items-start gap-3 flex-1">
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menú"
            className="lg:hidden shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-white/65 font-semibold">{eyebrow}</p>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-1 break-words">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-white/70 mt-1 sm:mt-1.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {right}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1D9E75' }} />
            <span className="text-xs font-medium">Datos en vivo</span>
          </div>
          <button
            type="button"
            aria-label="Notificaciones"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifications > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: '#F97316' }}
              >
                {notifications > 99 ? '99+' : notifications}
              </span>
            )}
          </button>
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm border border-white/25"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', letterSpacing: '0.02em' }}
            title={profile?.full_name ?? ''}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';

interface DashboardViewProps {
  onNewVacante: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNewVacante }) => {
  const stats = [
    { title: 'Vacantes Activas', value: '42', trend: '+12%', icon: '📋', accent: '#2563EB', bg: '#EFF6FF' },
    { title: 'Nuevos Postulantes', value: '1,284', trend: '+5%', icon: '👥', accent: '#059669', bg: '#ECFDF5' },
    { title: 'Tiempo Prom. Cierre', value: '18 días', trend: '-2 días', icon: '⏱', accent: '#D97706', bg: '#FFFBEB' },
    { title: 'Tasa de Colocación', value: '68%', trend: 'Estable', icon: '📈', accent: '#7C3AED', bg: '#F5F3FF' },
  ];

  const pipeline = [
    { label: 'Postulantes Nuevos', count: 850, pct: 100 },
    { label: 'En Screening', count: 320, pct: 38 },
    { label: 'Entrevistados', count: 145, pct: 17 },
    { label: 'Presentados a Cliente', count: 42, pct: 5 },
    { label: 'Contratados', count: 18, pct: 2 },
  ];

  const activity = [
    { time: 'Hace 10 min', action: 'Parseo de CV por correo completado', target: 'Operario de Bodega' },
    { time: 'Hace 45 min', action: 'Cliente aprobó finalista', target: 'Desarrollador Fullstack' },
    { time: 'Hace 2 horas', action: 'Sincronización XML con Chiletrabajos', target: 'Sistema' },
    { time: 'Ayer', action: 'Vacante creada e indexada', target: 'Jefe de Operaciones' },
  ];

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen de operaciones y métricas clave.</p>
        </div>
        <AtsButton icon={Icons.plus} onClick={onNewVacante}>Nueva Vacante</AtsButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl p-5 border border-border transition-all hover:shadow-md cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color: s.accent, background: s.bg }}>{s.trend}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{s.title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline + Activity */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-5">Pipeline General</h3>
          <div className="flex flex-col gap-4">
            {pipeline.map((bar, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">{bar.label}</span>
                  <span className="font-mono font-semibold text-foreground">{bar.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${bar.pct}%`, opacity: 1 - i * 0.15 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-5">Actividad Reciente</h3>
          <div className="flex flex-col gap-4">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.target} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

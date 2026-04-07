import React, { useState, useEffect } from 'react';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';
import { supabase } from '@/integrations/supabase/client';
import { PIPELINE_STAGES } from '@/data/mockData';

interface DashboardViewProps {
  onNewVacante: () => void;
  onSelectPostulante?: (id: string) => void;
}

interface PipelineCount {
  label: string;
  count: number;
  pct: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNewVacante, onSelectPostulante }) => {
  const [totalPostulantes, setTotalPostulantes] = useState(0);
  const [nuevosEstaSemana, setNuevosEstaSemana] = useState(0);
  const [pipelineCounts, setPipelineCounts] = useState<PipelineCount[]>([]);
  const [recentPostulantes, setRecentPostulantes] = useState<{ id: string; nombre: string; profesion: string | null; created_at: string | null; estado_pipeline: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // Fetch all postulantes with minimal fields
      const { data: allData } = await supabase
        .from('postulantes')
        .select('id, estado_pipeline, created_at, nombre, profesion')
        .order('created_at', { ascending: false });

      if (allData) {
        setTotalPostulantes(allData.length);

        // Count new this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const nuevos = allData.filter(p => p.created_at && new Date(p.created_at) >= oneWeekAgo).length;
        setNuevosEstaSemana(nuevos);

        // Pipeline counts
        const stageCounts: Record<string, number> = {};
        for (const p of allData) {
          const stage = p.estado_pipeline || 'Postulantes Nuevos';
          stageCounts[stage] = (stageCounts[stage] || 0) + 1;
        }
        const maxCount = Math.max(...Object.values(stageCounts), 1);
        const counts = PIPELINE_STAGES.map(stage => ({
          label: stage,
          count: stageCounts[stage] || 0,
          pct: Math.round(((stageCounts[stage] || 0) / maxCount) * 100),
        }));
        setPipelineCounts(counts);

        // Recent new postulantes only (estado_pipeline = 'Postulantes Nuevos')
        setRecentPostulantes(allData.filter(p => p.estado_pipeline === 'Postulantes Nuevos').slice(0, 5));
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const contratados = pipelineCounts.find(p => p.label === 'Contratado')?.count || 0;
  const tasaColocacion = totalPostulantes > 0 ? Math.round((contratados / totalPostulantes) * 100) : 0;

  const stats = [
    { title: 'Total Postulantes', value: totalPostulantes.toLocaleString(), trend: `${nuevosEstaSemana} esta semana`, icon: '👥', accent: '#2563EB', bg: '#EFF6FF' },
    { title: 'Postulantes Nuevos', value: pipelineCounts.find(p => p.label === 'Postulantes Nuevos')?.count.toLocaleString() || '0', trend: 'En pipeline', icon: '📋', accent: '#059669', bg: '#ECFDF5' },
    { title: 'En Proceso', value: pipelineCounts.filter(p => !['Postulantes Nuevos', 'Contratado'].includes(p.label)).reduce((sum, p) => sum + p.count, 0).toLocaleString(), trend: 'Activos', icon: '⏱', accent: '#D97706', bg: '#FFFBEB' },
    { title: 'Tasa de Colocación', value: `${tasaColocacion}%`, trend: `${contratados} contratados`, icon: '📈', accent: '#7C3AED', bg: '#F5F3FF' },
  ];

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen de operaciones y métricas clave.</p>
        </div>
        <AtsButton icon={Icons.plus} onClick={onNewVacante}>Nueva Vacante</AtsButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Cargando dashboard...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border border-border transition-all hover:shadow-md cursor-default">
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
                {pipelineCounts.map((bar, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">{bar.label}</span>
                      <span className="font-mono font-semibold text-foreground">{bar.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${bar.pct}%`, opacity: 1 - i * 0.12 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-5">Últimos Postulantes</h3>
              <div className="flex flex-col gap-4">
                {recentPostulantes.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => onSelectPostulante?.(p.id)}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.profesion || 'Sin profesión'} · {formatTimeAgo(p.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { formatName } from '@/lib/utils';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';
import { AppModal } from './AppModal';
import { supabase } from '@/integrations/supabase/client';
import { PIPELINE_STAGES } from '@/data/mockData';
import { useVacantesReales, type VacanteReal } from '@/hooks/useVacantesReales';
import { useClientes } from '@/hooks/useClientes';
import { addClienteOverride } from '@/lib/clienteMapping';

interface DashboardViewProps {
  onNewVacante: () => void;
  onSelectPostulante?: (id: string) => void;
}

interface PipelineCount {
  label: string;
  count: number;
  pct: number;
}

const inputClass = "w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

export const DashboardView: React.FC<DashboardViewProps> = ({ onNewVacante, onSelectPostulante }) => {
  const [totalPostulantes, setTotalPostulantes] = useState(0);
  const [nuevosEstaSemana, setNuevosEstaSemana] = useState(0);
  const [pipelineCounts, setPipelineCounts] = useState<PipelineCount[]>([]);
  const [recentPostulantes, setRecentPostulantes] = useState<{ id: string; nombre: string; profesion: string | null; created_at: string | null; estado_pipeline: string | null; vacante_origen: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Unassigned vacantes
  const { vacantes, refetch: refetchVacantes } = useVacantesReales();
  const { clientes } = useClientes();
  const sinCliente = useMemo(() => vacantes.filter(v => v.clienteNombre === 'Sin cliente'), [vacantes]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUnassigned, setSelectedUnassigned] = useState<VacanteReal | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const handleAssign = () => {
    if (!selectedUnassigned || !selectedClienteId) return;
    const cliente = clientes.find(c => c.id === selectedClienteId);
    if (!cliente) return;
    addClienteOverride(selectedUnassigned.cargo, cliente.nombre);
    refetchVacantes();
    setAssignModalOpen(false);
    setSelectedUnassigned(null);
    setSelectedClienteId('');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const { data: allData } = await supabase
        .from('postulantes')
        .select('id, estado_pipeline, created_at, nombre, profesion, vacante_origen')
        .order('created_at', { ascending: false });

      if (allData) {
        setTotalPostulantes(allData.length);

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const nuevos = allData.filter(p => p.created_at && new Date(p.created_at) >= oneWeekAgo).length;
        setNuevosEstaSemana(nuevos);

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

        setRecentPostulantes(allData.filter(p => p.estado_pipeline === 'Postulantes Nuevos').slice(0, 10));
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
    const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`;
    const d = new Date(normalized);
    const fecha = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', timeZone: 'America/Santiago' });
    const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' });
    return `${fecha} · ${hora}`;
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
          {/* Alert: cargos sin cliente */}
          {sinCliente.length > 0 && !dismissed && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {sinCliente.length} cargo{sinCliente.length > 1 ? 's' : ''} sin cliente asignado
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Nuevos cargos detectados que no coinciden con ninguna regla. Asígnalos a un cliente.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sinCliente.map(v => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedUnassigned(v);
                            setSelectedClienteId('');
                            setAssignModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <span>{v.cargo}</span>
                          <span className="text-muted-foreground">({v.postulantes})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 bg-transparent border-none cursor-pointer"
                  title="Ocultar"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

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
              <h3 className="text-sm font-semibold text-foreground mb-5">Nuevos Postulantes</h3>
              <div className="flex flex-col gap-4">
                {recentPostulantes.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => onSelectPostulante?.(p.id)}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatName(p.nombre)} <span className="text-xs font-normal text-muted-foreground">— {p.vacante_origen || 'Sin cargo'}</span></p>
                      <p className="text-xs text-muted-foreground">{p.profesion || 'Sin profesión'} · {formatDateTime(p.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal asignar cliente */}
      <AppModal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Asignar cargo a cliente" width={500}>
        {selectedUnassigned && (
          <div className="flex flex-col gap-4">
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Cargo detectado</p>
              <p className="font-semibold text-foreground">{selectedUnassigned.cargo}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedUnassigned.postulantes} postulante{selectedUnassigned.postulantes !== 1 ? 's' : ''}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Selecciona el cliente</label>
              <select
                className={inputClass}
                value={selectedClienteId}
                onChange={e => setSelectedClienteId(e.target.value)}
              >
                <option value="">— Selecciona un cliente —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedClienteId}
                onClick={handleAssign}
                className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
              >
                ✅ Asignar Cliente
              </button>
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
};

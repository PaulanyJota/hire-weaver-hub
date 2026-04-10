import React, { useState, useMemo } from 'react';
import { formatName } from '@/lib/utils';
import { Icons } from './Icons';
import { PIPELINE_STAGES, STAGE_COLORS } from '@/data/mockData';
import { getClienteForVacante, isRealVacante } from '@/lib/clienteMapping';
import type { Postulante } from '@/hooks/usePostulantes';

interface SupabasePipelineViewProps {
  postulantes: Postulante[];
  updateEstadoPipeline: (id: string, estado: string) => Promise<{ error: any }>;
  showToast: (msg: string) => void;
}

const getAvatar = (nombre: string) =>
  nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

type Hierarchy = Record<string, Record<string, Record<string, Postulante[]>>>;

export const SupabasePipelineView: React.FC<SupabasePipelineViewProps> = ({ postulantes, updateEstadoPipeline, showToast }) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedVacantes, setExpandedVacantes] = useState<Set<string>>(new Set());

  // Build hierarchy: stage → cliente → vacante → postulantes[]
  const stageData = useMemo<Hierarchy>(() => {
    const result: Hierarchy = {};
    PIPELINE_STAGES.forEach(s => { result[s] = {}; });

    const realPostulantes = postulantes.filter(p => isRealVacante(p.vacante_origen));

    realPostulantes.forEach(p => {
      const stage = p.estado_pipeline || 'Postulantes Nuevos';
      if (!result[stage]) result[stage] = {};
      const cliente = getClienteForVacante(p.vacante_origen);
      const vacante = p.vacante_origen || 'Sin vacante';
      if (!result[stage][cliente]) result[stage][cliente] = {};
      if (!result[stage][cliente][vacante]) result[stage][cliente][vacante] = [];
      result[stage][cliente][vacante].push(p);
    });
    return result;
  }, [postulantes]);

  const toggle = (set: Set<string>, key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDrop = async (stage: string) => {
    if (dragging) {
      const { error } = await updateEstadoPipeline(dragging, stage);
      if (!error) showToast(`Movido a ${stage}`);
      else showToast('Error al mover candidato');
    }
    setDragging(null);
    setHoverStage(null);
  };

  const getClienteTotal = (clientes: Record<string, Record<string, Postulante[]>>) =>
    Object.values(clientes).reduce((sum, vacs) =>
      sum + Object.values(vacs).reduce((s, arr) => s + arr.length, 0), 0);

  const getStageTotal = (stage: string) => {
    const clientes = stageData[stage] || {};
    return getClienteTotal(clientes);
  };

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pipeline de Postulantes</h1>
          <p className="text-sm text-muted-foreground mt-1">Cliente → Cargo → Postulantes. Arrastra candidatos entre etapas.</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: PIPELINE_STAGES.length * 296 }}>
          {PIPELINE_STAGES.map(stage => {
            const clientes = stageData[stage] || {};
            const clienteKeys = Object.keys(clientes).sort();
            const sc = STAGE_COLORS[stage];
            const isHover = hoverStage === stage && dragging !== null;

            return (
              <div
                key={stage}
                onDragOver={e => { e.preventDefault(); setHoverStage(stage); }}
                onDrop={() => handleDrop(stage)}
                onDragLeave={() => setHoverStage(null)}
                className="flex flex-col rounded-xl transition-all"
                style={{
                  width: 300,
                  background: isHover ? sc.bg : 'hsl(var(--surface))',
                  border: `1.5px ${isHover ? 'dashed' : 'solid'} ${isHover ? sc.dot : 'hsl(var(--border))'}`,
                }}
              >
                {/* Stage header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc.dot }} />
                    <p className="text-xs font-semibold" style={{ color: sc.text }}>{stage}</p>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: sc.text }}>{getStageTotal(stage)}</span>
                </div>

                {/* Client cards */}
                <div className="flex flex-col gap-2 px-3 pb-3 flex-1 max-h-[70vh] overflow-y-auto">
                  {clienteKeys.map(cliente => {
                    const vacantes = clientes[cliente];
                    const vacanteKeys = Object.keys(vacantes).sort();
                    const clienteKey = `${stage}::${cliente}`;
                    const isClientOpen = expandedClients.has(clienteKey);
                    const clienteCount = Object.values(vacantes).reduce((s, arr) => s + arr.length, 0);

                    return (
                      <div key={cliente} className="rounded-lg border border-border overflow-hidden">
                        {/* Client header */}
                        <button
                          onClick={() => toggle(expandedClients, clienteKey, setExpandedClients)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-card hover:bg-muted/60 transition-colors cursor-pointer border-none text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-[10px]" style={{ transform: isClientOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                            <span className="text-xs font-bold text-foreground truncate">🏢 {cliente}</span>
                          </div>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {clienteCount}
                          </span>
                        </button>

                        {/* Expanded: vacancies */}
                        {isClientOpen && (
                          <div className="flex flex-col gap-1.5 p-2 bg-muted/20 border-t border-border">
                            {vacanteKeys.map(vacante => {
                              const candidates = vacantes[vacante];
                              const vacanteKey = `${stage}::${cliente}::${vacante}`;
                              const isVacanteOpen = expandedVacantes.has(vacanteKey);

                              return (
                                <div key={vacante} className="rounded-md border border-border/60 overflow-hidden">
                                  {/* Vacancy header */}
                                  <button
                                    onClick={() => toggle(expandedVacantes, vacanteKey, setExpandedVacantes)}
                                    className="w-full flex items-center justify-between px-2.5 py-2 bg-card/80 hover:bg-muted/40 transition-colors cursor-pointer border-none text-left"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="text-[9px]" style={{ transform: isVacanteOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                                      <span className="text-[11px] font-semibold text-foreground/80 truncate">📋 {vacante}</span>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-muted-foreground ml-1.5 shrink-0">
                                      {candidates.length}
                                    </span>
                                  </button>

                                  {/* Expanded: candidates */}
                                  {isVacanteOpen && (
                                    <div className="flex flex-col gap-1 p-1.5 bg-muted/10 border-t border-border/40">
                                      {candidates.map(c => (
                                        <div
                                          key={c.id}
                                          draggable
                                          onDragStart={() => setDragging(c.id)}
                                          onDragEnd={() => { setDragging(null); setHoverStage(null); }}
                                          className="bg-card p-2 rounded-md border border-border cursor-grab transition-all hover:shadow-md hover:border-muted-foreground/30"
                                          style={{ opacity: dragging === c.id ? 0.5 : 1 }}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                                              {getAvatar(c.nombre)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[11px] font-semibold text-foreground truncate">{formatName(c.nombre)}</p>
                                              <p className="text-[9px] text-muted-foreground truncate">
                                                {c.profesion || 'Sin profesión'} · Match: {c.match_score ?? 0}%
                                              </p>
                                            </div>
                                            <select
                                              value={stage}
                                              onChange={e => updateEstadoPipeline(c.id, e.target.value).then(({ error }) => {
                                                if (!error) showToast(`Movido a ${e.target.value}`);
                                              })}
                                              className="text-[9px] border border-border rounded px-1 py-0.5 bg-muted text-secondary-foreground cursor-pointer outline-none"
                                            >
                                              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {clienteKeys.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                      Sin candidatos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

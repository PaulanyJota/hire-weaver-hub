import React, { useState, useMemo } from 'react';
import { formatName } from '@/lib/utils';
import { Icons } from './Icons';
import { PIPELINE_STAGES, STAGE_COLORS } from '@/data/mockData';
import type { Postulante } from '@/hooks/usePostulantes';

interface SupabasePipelineViewProps {
  postulantes: Postulante[];
  updateEstadoPipeline: (id: string, estado: string) => Promise<{ error: any }>;
  showToast: (msg: string) => void;
}

const getAvatar = (nombre: string) =>
  nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

export const SupabasePipelineView: React.FC<SupabasePipelineViewProps> = ({ postulantes, updateEstadoPipeline, showToast }) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  // Track which vacancy cards are expanded: key = `${stage}::${vacante}`
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Group postulantes by stage, then by vacante_origen
  const stageData = useMemo(() => {
    const result: Record<string, Record<string, Postulante[]>> = {};
    PIPELINE_STAGES.forEach(s => { result[s] = {}; });
    postulantes.forEach(p => {
      const stage = p.estado_pipeline || 'Postulantes Nuevos';
      if (!result[stage]) result[stage] = {};
      const vacante = p.vacante_origen || 'Sin vacante';
      if (!result[stage][vacante]) result[stage][vacante] = [];
      result[stage][vacante].push(p);
    });
    return result;
  }, [postulantes]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
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

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pipeline de Postulantes</h1>
          <p className="text-sm text-muted-foreground mt-1">Haz click en un cargo para ver los postulantes. Arrastra candidatos entre etapas.</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: PIPELINE_STAGES.length * 296 }}>
          {PIPELINE_STAGES.map(stage => {
            const vacantes = stageData[stage] || {};
            const vacanteKeys = Object.keys(vacantes).sort();
            const totalCandidates = Object.values(vacantes).reduce((sum, arr) => sum + arr.length, 0);
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
                  width: 280,
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
                  <span className="text-xs font-mono font-bold" style={{ color: sc.text }}>{totalCandidates}</span>
                </div>

                {/* Vacancy cards */}
                <div className="flex flex-col gap-2 px-3 pb-3 flex-1">
                  {vacanteKeys.map(vacante => {
                    const candidates = vacantes[vacante];
                    const key = `${stage}::${vacante}`;
                    const isOpen = expanded.has(key);

                    return (
                      <div key={vacante} className="rounded-lg border border-border overflow-hidden">
                        {/* Vacancy header - clickable */}
                        <button
                          onClick={() => toggleExpand(key)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-card hover:bg-muted/60 transition-colors cursor-pointer border-none text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
                            <span className="text-xs font-semibold text-foreground truncate">{vacante}</span>
                          </div>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {candidates.length}
                          </span>
                        </button>

                        {/* Expanded candidates */}
                        {isOpen && (
                          <div className="flex flex-col gap-1.5 p-2 bg-muted/30 border-t border-border">
                            {candidates.map(c => (
                              <div
                                key={c.id}
                                draggable
                                onDragStart={() => setDragging(c.id)}
                                onDragEnd={() => { setDragging(null); setHoverStage(null); }}
                                className="bg-card p-2.5 rounded-lg border border-border cursor-grab transition-all hover:shadow-md hover:border-muted-foreground/30"
                                style={{ opacity: dragging === c.id ? 0.5 : 1 }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {getAvatar(c.nombre)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-foreground truncate">{formatName(c.nombre)}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {c.profesion || 'Sin profesión'} · {c.fecha_postulacion ? new Date(c.fecha_postulacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                                    </p>
                                  </div>
                                </div>

                                {/* Match bar */}
                                <div className="mb-2">
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-muted-foreground">Match</span>
                                    <span className="font-mono font-bold" style={{ color: (c.match_score ?? 0) >= 80 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>
                                      {c.match_score ?? 0}%
                                    </span>
                                  </div>
                                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${c.match_score ?? 0}%`,
                                        background: (c.match_score ?? 0) >= 80 ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-1">
                                    {c.email && (
                                      <button
                                        onClick={() => showToast(`Enviando correo a ${c.nombre}...`)}
                                        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors bg-transparent border-none cursor-pointer"
                                      >{Icons.mail}</button>
                                    )}
                                    {c.telefono && (
                                      <button
                                        onClick={() => window.open(`https://wa.me/56${c.telefono?.replace(/\D/g, '')}`, '_blank')}
                                        className="p-1 rounded-md text-muted-foreground hover:text-success hover:bg-success/10 transition-colors bg-transparent border-none cursor-pointer"
                                      >{Icons.chat}</button>
                                    )}
                                  </div>
                                  <select
                                    value={stage}
                                    onChange={e => updateEstadoPipeline(c.id, e.target.value).then(({ error }) => {
                                      if (!error) showToast(`Movido a ${e.target.value}`);
                                    })}
                                    className="text-[10px] border border-border rounded-md px-1.5 py-0.5 bg-muted text-secondary-foreground cursor-pointer outline-none"
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

                  {vacanteKeys.length === 0 && (
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

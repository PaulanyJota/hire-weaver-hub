import React, { useState } from 'react';
import { formatName } from '@/lib/utils';
import { AtsButton } from './AtsButton';
import { AtsBadge } from './AtsBadge';
import { Icons } from './Icons';
import { AppModal } from './AppModal';
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
  const [selectedCandidate, setSelectedCandidate] = useState<Postulante | null>(null);

  const getCandidatosByStage = (stage: string) =>
    postulantes.filter(p => p.estado_pipeline === stage);

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
          <p className="text-sm text-muted-foreground mt-1">Arrastra candidatos entre etapas para actualizar su estado.</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: PIPELINE_STAGES.length * 296 }}>
          {PIPELINE_STAGES.map(stage => {
            const candidates = getCandidatosByStage(stage);
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
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc.dot }} />
                    <p className="text-xs font-semibold" style={{ color: sc.text }}>{stage}</p>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: sc.text }}>{candidates.length}</span>
                </div>

                <div className="flex flex-col gap-2.5 px-3 pb-3 flex-1">
                  {candidates.map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragging(c.id)}
                      onDragEnd={() => { setDragging(null); setHoverStage(null); }}
                      className="bg-card p-3.5 rounded-xl border border-border cursor-grab transition-all hover:shadow-md hover:border-muted-foreground/30"
                      style={{ opacity: dragging === c.id ? 0.5 : 1 }}
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{getAvatar(c.nombre)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{formatName(c.nombre)}</p>
                          <p className="text-[11px] text-muted-foreground">{c.profesion || 'Sin profesión'} · {c.experiencia || '—'}</p>
                        </div>
                      </div>

                      {/* Match */}
                      <div className="mb-3">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground font-medium">Match</span>
                          <span className="font-mono font-bold" style={{ color: (c.match_score ?? 0) >= 80 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{c.match_score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
                          className="text-[11px] border border-border rounded-md px-2 py-1 bg-muted text-secondary-foreground cursor-pointer outline-none"
                        >
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {c.fuente && (
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          Fuente: {c.fuente}
                        </div>
                      )}
                    </div>
                  ))}

                  {candidates.length === 0 && (
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

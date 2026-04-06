import React, { useState } from 'react';
import { AtsButton } from './AtsButton';
import { AtsBadge } from './AtsBadge';
import { Icons } from './Icons';
import { MOCK_CLIENTES, MOCK_TALENTOS, PIPELINE_STAGES, STAGE_COLORS, type Vacante, type PipelineEntry } from '@/data/mockData';

interface PipelineViewProps {
  vacante: Vacante;
  onBack: () => void;
  pipelineState: PipelineEntry[];
  updatePipeline: (vId: number, cId: number, stage: string) => void;
  showToast: (msg: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ vacante, onBack, pipelineState, updatePipeline, showToast }) => {
  const [dragging, setDragging] = useState<number | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);

  const getCandidatosByStage = (stage: string) =>
    pipelineState
      .filter(p => p.vacanteId === vacante.id && p.etapa === stage)
      .map(p => {
        const t = MOCK_TALENTOS.find(t => t.id === p.candidatoId);
        return t ? { ...t, pipelineId: `${p.vacanteId}-${p.candidatoId}` } : null;
      })
      .filter(Boolean) as (typeof MOCK_TALENTOS[0] & { pipelineId: string })[];

  const cliente = MOCK_CLIENTES.find(c => c.id === vacante.clienteId);

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer">
            {Icons.arrowLeft} Volver a Vacantes
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{vacante.cargo}</h1>
            <AtsBadge color="blue">{cliente?.nombre}</AtsBadge>
            <AtsBadge color="purple">{vacante.tipo}</AtsBadge>
          </div>
        </div>
        <div className="flex gap-2">
          <AtsButton variant="secondary" icon={Icons.search} onClick={() => showToast('Buscando en repositorio de talentos...')}>Buscar en BD</AtsButton>
          <AtsButton icon={Icons.plus} onClick={() => showToast('Abriendo formulario de ingreso...')}>Añadir Candidato</AtsButton>
        </div>
      </div>

      {/* Kanban */}
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
                onDrop={() => { if (dragging) updatePipeline(vacante.id, dragging, stage); setDragging(null); setHoverStage(null); }}
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
                  <span className="text-xs font-mono font-bold" style={{ color: sc.text }}>{candidates.length}</span>
                </div>

                {/* Cards */}
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
                      {/* Name */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{c.avatar}</div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.nombre}</p>
                          <p className="text-[11px] text-muted-foreground">{c.experiencia} exp. · {c.renta}</p>
                        </div>
                      </div>

                      {/* Match */}
                      <div className="mb-3">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground font-medium">Match</span>
                          <span className="font-mono font-bold" style={{ color: c.match >= 80 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{c.match}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${c.match}%`,
                              background: c.match >= 80 ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                            }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            onClick={() => showToast(`Enviando correo a ${c.nombre}...`)}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors bg-transparent border-none cursor-pointer"
                          >{Icons.mail}</button>
                          <button
                            onClick={() => showToast(`WhatsApp a ${c.nombre}...`)}
                            className="p-1 rounded-md text-muted-foreground hover:text-success hover:bg-success/10 transition-colors bg-transparent border-none cursor-pointer"
                          >{Icons.chat}</button>
                        </div>
                        <select
                          value={stage}
                          onChange={e => updatePipeline(vacante.id, c.id, e.target.value)}
                          className="text-[11px] border border-border rounded-md px-2 py-1 bg-muted text-secondary-foreground cursor-pointer outline-none"
                        >
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {stage === 'Finalista' && (
                        <button
                          onClick={() => showToast(`✅ Ficha de ${c.nombre} enviada al cliente.`)}
                          className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          {Icons.file} Presentar a Cliente
                        </button>
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

import React, { useState } from 'react';
import { AtsButton } from './AtsButton';
import { AtsBadge } from './AtsBadge';
import { Icons } from './Icons';
import { AppModal } from './AppModal';
import { MOCK_CLIENTES, MOCK_TALENTOS, PIPELINE_STAGES, STAGE_COLORS, RESPONSABLES, type Vacante, type PipelineEntry } from '@/data/mockData';

interface CandidateScore {
  score: number;
  notes: string[];
}

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
  const [scores, setScores] = useState<Record<number, CandidateScore>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const getScore = (id: number) => scores[id]?.score || 0;
  const getNotes = (id: number) => scores[id]?.notes || [];

  const setScore = (id: number, score: number) => {
    setScores(prev => ({
      ...prev,
      [id]: { score, notes: prev[id]?.notes || [] },
    }));
  };

  const addNote = (id: number, note: string) => {
    if (!note.trim()) return;
    setScores(prev => ({
      ...prev,
      [id]: { score: prev[id]?.score || 0, notes: [...(prev[id]?.notes || []), note] },
    }));
    setNoteInput('');
    showToast('Nota agregada');
  };

  const getCandidatosByStage = (stage: string) =>
    pipelineState
      .filter(p => p.vacanteId === vacante.id && p.etapa === stage)
      .map(p => {
        const t = MOCK_TALENTOS.find(t => t.id === p.candidatoId);
        return t ? { ...t, pipelineId: `${p.vacanteId}-${p.candidatoId}` } : null;
      })
      .filter(Boolean) as (typeof MOCK_TALENTOS[0] & { pipelineId: string })[];

  const cliente = MOCK_CLIENTES.find(c => c.id === vacante.clienteId);
  const responsable = RESPONSABLES.find(r => r.id === vacante.responsableId);
  const selectedCandidateData = selectedCandidate ? MOCK_TALENTOS.find(t => t.id === selectedCandidate) : null;

  const StarRating = ({ candidateId, size = 14 }: { candidateId: number; size?: number }) => {
    const current = getScore(candidateId);
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={e => { e.stopPropagation(); setScore(candidateId, star === current ? 0 : star); }}
            className="bg-transparent border-none cursor-pointer p-0 transition-transform hover:scale-110"
            title={`${star} estrella${star > 1 ? 's' : ''}`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={star <= current ? 'hsl(var(--warning))' : 'none'} stroke={star <= current ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

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
            {responsable && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{responsable.iniciales}</span>
                {responsable.nombre.split(' ')[0]}
              </span>
            )}
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
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{c.nombre}</p>
                          <p className="text-[11px] text-muted-foreground">{c.experiencia} exp. · {c.renta}</p>
                        </div>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center justify-between mb-3">
                        <StarRating candidateId={c.id} />
                        <button
                          onClick={() => setSelectedCandidate(c.id)}
                          className="text-[11px] text-muted-foreground hover:text-primary bg-transparent border-none cursor-pointer transition-colors flex items-center gap-1"
                        >
                          {Icons.file}
                          <span>{getNotes(c.id).length > 0 ? `${getNotes(c.id).length} nota${getNotes(c.id).length > 1 ? 's' : ''}` : 'Evaluar'}</span>
                        </button>
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

      {/* Modal de evaluación */}
      <AppModal
        isOpen={!!selectedCandidate}
        onClose={() => { setSelectedCandidate(null); setNoteInput(''); }}
        title={`Evaluación — ${selectedCandidateData?.nombre || ''}`}
        width={520}
      >
        {selectedCandidateData && (
          <div className="flex flex-col gap-5">
            {/* Candidate info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{selectedCandidateData.avatar}</div>
              <div>
                <p className="font-semibold text-foreground">{selectedCandidateData.nombre}</p>
                <p className="text-xs text-muted-foreground">{selectedCandidateData.profesion} · {selectedCandidateData.experiencia} exp.</p>
              </div>
            </div>

            {/* Scoring */}
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Puntuación General</p>
              <div className="flex items-center gap-3">
                <StarRating candidateId={selectedCandidateData.id} size={22} />
                <span className="text-lg font-bold text-foreground">{getScore(selectedCandidateData.id)}/5</span>
              </div>
            </div>

            {/* Skills */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Habilidades</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCandidateData.habilidades.map(h => (
                  <span key={h} className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg">{h}</span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Notas del Reclutador</p>
              {getNotes(selectedCandidateData.id).length > 0 ? (
                <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto">
                  {getNotes(selectedCandidateData.id).map((note, i) => (
                    <div key={i} className="p-2.5 bg-muted rounded-lg text-sm text-foreground">
                      {note}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">Sin notas aún.</p>
              )}
              <div className="flex gap-2">
                <input
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote(selectedCandidateData.id, noteInput)}
                  placeholder="Agregar nota sobre el candidato..."
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  onClick={() => addNote(selectedCandidateData.id, noteInput)}
                  className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
};

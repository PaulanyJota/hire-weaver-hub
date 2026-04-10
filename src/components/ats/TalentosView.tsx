import React, { useState, useEffect, useMemo } from 'react';
import { formatName } from '@/lib/utils';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';
import { supabase } from '@/integrations/supabase/client';
import { PIPELINE_STAGES } from '@/data/mockData';
import type { Postulante } from '@/hooks/usePostulantes';

interface TalentosViewProps {
  showToast: (msg: string) => void;
  initialPostulanteId?: string | null;
}

const getAvatar = (nombre: string) =>
  nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/** Strip trailing date/time stamps from vacante_origen to normalize grouping */
const normalizeCargo = (raw: string | null): string => {
  if (!raw) return 'Sin vacante';
  // Remove trailing date patterns like "2026-04-01 09:16:18" or "2026-04-01 1"
  let cleaned = raw.replace(/\s+\d{4}-\d{2}-\d{2}[\s\d:]*$/, '').trim();
  // Remove leading "Postulo " or "Re: "
  cleaned = cleaned.replace(/^(Postulo\s+|Re:\s+)/i, '').trim();
  // Remove "Nueva Clave..." type system emails
  if (cleaned.toLowerCase().includes('nueva clave') || cleaned.toLowerCase().includes('api')) return '__system__';
  return cleaned || 'Sin vacante';
};

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const TalentosView: React.FC<TalentosViewProps> = ({ showToast, initialPostulanteId }) => {
  const [editPhone, setEditPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [allPostulantes, setAllPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCargo, setSelectedCargo] = useState<string | null>(null);
  const [selectedPostulante, setSelectedPostulante] = useState<Postulante | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversation, setShowConversation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('postulantes')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        setAllPostulantes(data);
        // Auto-open a specific postulante if requested
        if (initialPostulanteId) {
          const match = data.find(p => p.id === initialPostulanteId);
          if (match) {
            setSelectedPostulante(match);
            const cargo = normalizeCargo(match.vacante_origen);
            if (cargo !== '__system__') setSelectedCargo(cargo);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [initialPostulanteId]);

  // Group by normalized cargo
  const grouped = useMemo(() => {
    const map: Record<string, Postulante[]> = {};
    for (const p of allPostulantes) {
      const cargo = normalizeCargo(p.vacante_origen);
      if (cargo === '__system__') continue;
      if (!map[cargo]) map[cargo] = [];
      map[cargo].push(p);
    }
    // Sort by count desc
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [allPostulantes]);

  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    return grouped.filter(([cargo, posts]) =>
      cargo.toLowerCase().includes(q) || posts.some(p => p.nombre.toLowerCase().includes(q))
    );
  }, [grouped, searchQuery]);

  const cargoPostulantes = useMemo(() => {
    if (!selectedCargo) return [];
    const entry = grouped.find(([c]) => c === selectedCargo);
    const posts = entry ? [...entry[1]] : [];
    return posts.sort((a, b) => {
      const da = a.fecha_postulacion ? new Date(a.fecha_postulacion).getTime() : 0;
      const db = b.fecha_postulacion ? new Date(b.fecha_postulacion).getTime() : 0;
      return db - da;
    });
  }, [selectedCargo, grouped]);

  // === Profile View ===
  if (selectedPostulante) {
    const p = selectedPostulante;
    return (
      <div style={{ animation: 'fadeSlide 0.3s' }}>
        <button
          onClick={() => setSelectedPostulante(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 bg-transparent border-none cursor-pointer transition-colors"
        >
          ← Volver a {selectedCargo}
        </button>

        <div className="bg-card rounded-2xl border border-border p-8 max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-bold flex items-center justify-center">
              {getAvatar(p.nombre)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{formatName(p.nombre)}</h1>
              <p className="text-sm text-muted-foreground">{p.profesion || 'Sin profesión'}</p>
              {p.telefono && !p.telefono.includes('$') && (
                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  ✅ WhatsApp contactado
                </span>
              )}
            </div>
            <select
              value={p.estado_pipeline || 'Postulantes Nuevos'}
              onChange={async (e) => {
                const nuevoEstado = e.target.value;
                const { error } = await supabase
                  .from('postulantes')
                  .update({ estado_pipeline: nuevoEstado })
                  .eq('id', p.id);
                if (!error) {
                  setSelectedPostulante({ ...p, estado_pipeline: nuevoEstado });
                  setAllPostulantes(prev => prev.map(x => x.id === p.id ? { ...x, estado_pipeline: nuevoEstado } : x));
                  showToast(`Estado actualizado a "${nuevoEstado}"`);
                }
              }}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-border bg-muted text-foreground font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-primary/20"
            >
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {[
              { label: 'Email', value: p.email },
              { label: 'Teléfono', value: p.telefono },
              { label: 'Pretensión de Renta', value: p.pretension_renta },
              { label: 'Estado Pipeline', value: p.estado_pipeline },
              { label: 'Fecha Postulación', value: formatDate(p.fecha_postulacion) },
              { label: 'Experiencia', value: p.experiencia },
              { label: 'Fuente', value: p.fuente },
              { label: 'Vacante Origen', value: p.vacante_origen },
              { label: 'Match Score', value: p.match_score != null ? `${p.match_score}%` : null },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">{label}</p>
                <p className="text-sm font-medium text-foreground">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* === Sección WhatsApp unificada === */}
          <div className="mb-6 p-4 bg-muted/40 rounded-xl border border-border">
            {(() => {
              const raw = p.telefono?.replace(/\D/g, '') || '';
              const hasPhone = raw.length >= 8 && !p.telefono?.includes('$');

              if (hasPhone) {
                const phoneNumber = raw.startsWith('56') ? raw : `56${raw}`;
                return (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowConversation(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border-none transition-all cursor-pointer bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    >
                      💬 Ver conversación WhatsApp
                    </button>
                    <button
                      onClick={() => window.open(`https://wa.me/${phoneNumber}`, '_blank')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border-none transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      📱 Iniciar Conversación
                    </button>
                    {p.cv_url && (
                      <button
                        onClick={() => window.open(p.cv_url!, '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
                      >
                        📄 Ver CV
                      </button>
                    )}
                    {p.email && (
                      <AtsButton variant="secondary" small onClick={() => window.open(`mailto:${p.email}`)}>
                        ✉ Enviar Email
                      </AtsButton>
                    )}
                  </div>
                );
              }

              return (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">📱 Sin número de WhatsApp registrado</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder="+56 9 XXXX XXXX"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      disabled={savingPhone || editPhone.replace(/\D/g, '').length < 8}
                      onClick={async () => {
                        setSavingPhone(true);
                        const cleanNum = editPhone.replace(/\D/g, '');
                        const finalNum = cleanNum.startsWith('56') ? cleanNum : `56${cleanNum}`;
                        const { error } = await supabase
                          .from('postulantes')
                          .update({ telefono: finalNum })
                          .eq('id', p.id);
                        if (!error) {
                          const updated = { ...p, telefono: finalNum };
                          setSelectedPostulante(updated);
                          setAllPostulantes(prev => prev.map(x => x.id === p.id ? { ...x, telefono: finalNum } : x));
                          setEditPhone('');
                          showToast('Número de WhatsApp guardado');
                        } else {
                          showToast('Error al guardar el número');
                        }
                        setSavingPhone(false);
                      }}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg border-none transition-all cursor-pointer ${
                        savingPhone || editPhone.replace(/\D/g, '').length < 8
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {savingPhone ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {p.cv_url && (
                      <button
                        onClick={() => window.open(p.cv_url!, '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
                      >
                        📄 Ver CV
                      </button>
                    )}
                    {p.email && (
                      <AtsButton variant="secondary" small onClick={() => window.open(`mailto:${p.email}`)}>
                        ✉ Enviar Email
                      </AtsButton>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* === Modal Conversación WhatsApp === */}
          {showConversation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConversation(false)}>
              <div
                className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                      {getAvatar(p.nombre)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{formatName(p.nombre)}</p>
                      <p className="text-xs text-muted-foreground">Conversación registrada</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConversation(false)}
                    className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground border-none cursor-pointer transition-colors text-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Chat bubbles */}
                <div className="flex-1 overflow-y-auto p-5">
                  {p.mensaje_postulante || p.respuesta_agente ? (
                    <div className="flex flex-col gap-4">
                      {p.mensaje_postulante && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] bg-muted p-4 rounded-2xl rounded-bl-md">
                            <p className="text-[10px] text-muted-foreground font-semibold mb-1.5">Mensaje del Postulante</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{p.mensaje_postulante}</p>
                          </div>
                        </div>
                      )}
                      {p.respuesta_agente && (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-blue-50 text-blue-900 p-4 rounded-2xl rounded-br-md">
                            <p className="text-[10px] text-blue-600 font-semibold mb-1.5">🤖 Respuesta del Agente IA</p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.respuesta_agente}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground italic">Aún no hay conversación registrada</p>
                    </div>
                  )}
                </div>

                {/* Footer — WhatsApp button */}
                <div className="p-5 border-t border-border">
                  {(() => {
                    const raw = p.telefono?.replace(/\D/g, '') || '';
                    const hasPhone = raw.length >= 8 && !p.telefono?.includes('$');
                    if (hasPhone) {
                      const phoneNumber = raw.startsWith('56') ? raw : `56${raw}`;
                      const firstName = p.nombre.split(' ')[0];
                      const cargoText = p.vacante_origen ? normalizeCargo(p.vacante_origen) : 'la vacante';
                      const prefilledMsg = encodeURIComponent(`Hola ${firstName}, somos Nodo Talentos. Vimos tu postulación al cargo ${cargoText}. Nos gustaría conocerte mejor. ¿Puedes responder estas preguntas?\n\n1) ¿Cuántos años de experiencia tienes?\n2) ¿Cuál es tu disponibilidad?\n3) ¿Cuál es tu pretensión de renta?`);
                      return (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => window.open(`https://wa.me/${phoneNumber}`, '_blank')}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl border-none transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                          >
                            📱 Continuar conversación
                          </button>
                          <button
                            onClick={() => window.open(`https://wa.me/${phoneNumber}?text=${prefilledMsg}`, '_blank')}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl border-none transition-all cursor-pointer bg-green-600 hover:bg-green-700 text-white shadow-sm"
                          >
                            🚀 Iniciar conversación del cargo
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-2">📱 Sin número registrado</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            placeholder="+56 9 XXXX XXXX"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          <button
                            disabled={savingPhone || editPhone.replace(/\D/g, '').length < 8}
                            onClick={async () => {
                              setSavingPhone(true);
                              const cleanNum = editPhone.replace(/\D/g, '');
                              const finalNum = cleanNum.startsWith('56') ? cleanNum : `56${cleanNum}`;
                              const { error } = await supabase
                                .from('postulantes')
                                .update({ telefono: finalNum })
                                .eq('id', p.id);
                              if (!error) {
                                const updated = { ...p, telefono: finalNum };
                                setSelectedPostulante(updated);
                                setAllPostulantes(prev => prev.map(x => x.id === p.id ? { ...x, telefono: finalNum } : x));
                                setEditPhone('');
                                showToast('Número de WhatsApp guardado');
                              } else {
                                showToast('Error al guardar el número');
                              }
                              setSavingPhone(false);
                            }}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg border-none transition-all cursor-pointer ${
                              savingPhone || editPhone.replace(/\D/g, '').length < 8
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            }`}
                          >
                            {savingPhone ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Postulantes List for a Cargo ===
  if (selectedCargo) {
    return (
      <div style={{ animation: 'fadeSlide 0.3s' }}>
        <button
          onClick={() => setSelectedCargo(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 bg-transparent border-none cursor-pointer transition-colors"
        >
          ← Volver a cargos
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{selectedCargo}</h1>
            <p className="text-sm text-muted-foreground mt-1">{cargoPostulantes.length} postulantes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cargoPostulantes.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedPostulante(t)}
              className="bg-card rounded-2xl p-5 border border-border transition-all hover:shadow-md hover:border-primary/30 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{getAvatar(t.nombre)}</div>
                  <div>
                    <p className="font-semibold text-foreground">{formatName(t.nombre)}</p>
                    <p className="text-xs text-muted-foreground">{t.email || 'Sin email'}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                  {t.estado_pipeline || 'Nuevo'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Postulación: {formatDate(t.fecha_postulacion)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === Cargo List (grouped) ===
  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Repositorio de Talentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allPostulantes.length} postulantes en {grouped.length} cargos.
          </p>
        </div>
        <AtsButton icon={Icons.plus} onClick={() => showToast('Abriendo importador de CVs (PDF/Word)...')}>Importar CVs</AtsButton>
      </div>

      {/* Search */}
      <div className="flex items-end gap-4 mb-8 bg-card p-5 rounded-2xl border border-border">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Buscar cargo o postulante</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{Icons.search}</span>
            <input
              placeholder="Operario, Gruero, Ejecutivo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Cargando postulantes...</div>
      ) : filteredGrouped.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">No se encontraron cargos.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredGrouped.map(([cargo, posts]) => (
            <div
              key={cargo}
              onClick={() => setSelectedCargo(cargo)}
              className="bg-card rounded-2xl p-5 border border-border transition-all hover:shadow-md hover:border-primary/30 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                  📋
                </div>
                <div>
                  <p className="font-semibold text-foreground">{cargo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{posts.length} postulante{posts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini avatars */}
                <div className="flex -space-x-2">
                  {posts.slice(0, 3).map(p => (
                    <div key={p.id} className="w-7 h-7 rounded-full bg-muted border-2 border-card text-[9px] font-bold text-muted-foreground flex items-center justify-center">
                      {getAvatar(p.nombre)}
                    </div>
                  ))}
                  {posts.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-card text-[9px] font-bold text-muted-foreground flex items-center justify-center">
                      +{posts.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-muted-foreground">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

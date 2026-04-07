import React, { useState, useEffect, useMemo } from 'react';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';
import { supabase } from '@/integrations/supabase/client';
import { PIPELINE_STAGES } from '@/data/mockData';
import type { Postulante } from '@/hooks/usePostulantes';

interface TalentosViewProps {
  showToast: (msg: string) => void;
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

export const TalentosView: React.FC<TalentosViewProps> = ({ showToast }) => {
  const [allPostulantes, setAllPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCargo, setSelectedCargo] = useState<string | null>(null);
  const [selectedPostulante, setSelectedPostulante] = useState<Postulante | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('postulantes')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setAllPostulantes(data);
      setLoading(false);
    };
    fetch();
  }, []);

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
              <h1 className="text-xl font-bold text-foreground">{p.nombre}</h1>
              <p className="text-sm text-muted-foreground">{p.profesion || 'Sin profesión'}</p>
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
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">{label}</p>
                <p className="text-sm font-medium text-foreground">{value || '—'}</p>
              </div>
            ))}
          </div>

          {p.habilidades && p.habilidades.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Habilidades</p>
              <div className="flex flex-wrap gap-2">
                {p.habilidades.map(h => (
                  <span key={h} className="px-2.5 py-1 bg-muted text-secondary-foreground text-xs font-medium rounded-lg">{h}</span>
                ))}
              </div>
            </div>
          )}

          {p.notas && (
            <div className="mb-6">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Notas</p>
              <p className="text-sm text-foreground bg-muted p-4 rounded-xl whitespace-pre-wrap">{p.notas}</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            {p.email && (
              <AtsButton variant="secondary" small onClick={() => window.open(`mailto:${p.email}`)}>
                ✉ Enviar Email
              </AtsButton>
            )}
            {p.telefono && (
              <AtsButton small onClick={() => window.open(`https://wa.me/56${p.telefono?.replace(/\D/g, '')}`, '_blank')}>
                💬 WhatsApp
              </AtsButton>
            )}
          </div>
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
                    <p className="font-semibold text-foreground">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">{t.email || 'Sin email'}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                  {t.estado_pipeline || 'Nuevo'}
                </span>
              </div>
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

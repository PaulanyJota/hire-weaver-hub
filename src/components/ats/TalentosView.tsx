import React from 'react';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';
import type { Postulante } from '@/hooks/usePostulantes';

interface TalentosViewProps {
  showToast: (msg: string) => void;
  postulantes: Postulante[];
  loading: boolean;
}

const getAvatar = (nombre: string) =>
  nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

export const TalentosView: React.FC<TalentosViewProps> = ({ showToast, postulantes, loading }) => (
  <div style={{ animation: 'fadeSlide 0.3s' }}>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Repositorio de Talentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Base de datos centralizada y buscador inteligente.</p>
      </div>
      <AtsButton icon={Icons.plus} onClick={() => showToast('Abriendo importador de CVs (PDF/Word)...')}>Importar CVs</AtsButton>
    </div>

    {/* Search */}
    <div className="flex items-end gap-4 mb-8 bg-card p-5 rounded-2xl border border-border">
      <div className="flex-1">
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Palabras Clave</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{Icons.search}</span>
          <input
            placeholder="React, Fullstack, Operario..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Experiencia</label>
        <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none cursor-pointer">
          <option>Cualquiera</option><option>+2 años</option><option>+5 años</option>
        </select>
      </div>
      <AtsButton>Buscar</AtsButton>
    </div>

    {loading ? (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Cargando postulantes...</div>
    ) : postulantes.length === 0 ? (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">No hay postulantes en la base de datos.</div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {postulantes.map(t => (
          <div key={t.id} className="bg-card rounded-2xl p-5 border border-border transition-all hover:shadow-md hover:border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{getAvatar(t.nombre)}</div>
                <div>
                  <p className="font-semibold text-foreground">{t.nombre}</p>
                  <p className="text-xs text-muted-foreground">{t.profesion || 'Sin profesión'}</p>
                </div>
              </div>
              <button className="text-border hover:text-warning transition-colors bg-transparent border-none cursor-pointer">{Icons.star}</button>
            </div>

            <div className="flex gap-6 mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Experiencia</p>
                <p className="text-sm font-semibold text-foreground">{t.experiencia || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pretensión</p>
                <p className="text-sm font-semibold text-foreground">{t.pretension_renta || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Match</p>
                <p className="text-sm font-semibold text-foreground">{t.match_score ?? 0}%</p>
              </div>
            </div>

            {t.habilidades && t.habilidades.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1.5">Habilidades</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.habilidades.map(h => (
                    <span key={h} className="px-2 py-0.5 bg-muted text-secondary-foreground text-[11px] font-medium rounded-md">{h}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <AtsButton variant="secondary" small onClick={() => showToast(`Perfil de ${t.nombre}`)} style={{ flex: 1 }}>Ver Perfil</AtsButton>
              <AtsButton small onClick={() => showToast(`Asignando a ${t.nombre}...`)} style={{ flex: 1 }}>Asignar</AtsButton>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

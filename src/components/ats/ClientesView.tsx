import React, { useState, useEffect, useCallback } from 'react';
import { formatName } from '@/lib/utils';
import { useClientes, type ClienteDB } from '@/hooks/useClientes';
import { useVacantesReales, type VacanteReal } from '@/hooks/useVacantesReales';
import { supabase } from '@/integrations/supabase/client';
import { RESPONSABLES } from '@/data/mockData';
import { AtsBadge } from './AtsBadge';
import { AtsButton } from './AtsButton';
import { AppModal } from './AppModal';
import { Icons } from './Icons';

interface ClientesViewProps {
  showToast: (msg: string) => void;
}

interface PostulanteRow {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  profesion: string | null;
  experiencia: string | null;
  pretension_renta: string | null;
  habilidades: string[] | null;
  estado_pipeline: string | null;
  match_score: number | null;
  notas: string | null;
  fecha_postulacion: string | null;
}

interface VacanteManual {
  id: string;
  cargo: string;
  tipo: string;
  ubicacion: string;
  renta: string;
  estado: string;
  responsable_id: string;
  cliente_id: string;
}

// Unified vacante item for display
interface VacanteItem {
  id: string;
  cargo: string;
  ubicacion: string;
  tipo: string;
  estado: string;
  postulantes: number;
  source: 'auto' | 'manual';
}

const PIPELINE_STAGES = ['Postulantes Nuevos', 'En Screening', 'Entrevistados', 'Presentados a Cliente', 'Finalista', 'Contratado', 'Descartado'];
const inputClass = "w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

export const ClientesView: React.FC<ClientesViewProps> = ({ showToast }) => {
  const { clientes, loading, addCliente } = useClientes();
  const { vacantes: autoVacantes } = useVacantesReales();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', industria: '', contacto: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Manual vacantes
  const [manualVacantes, setManualVacantes] = useState<VacanteManual[]>([]);
  const [isVacanteModalOpen, setIsVacanteModalOpen] = useState(false);
  const [vacanteForm, setVacanteForm] = useState({ cargo: '', tipo: 'Reclutamiento', ubicacion: '', renta: '', responsableId: 'JRB' });
  const [savingVacante, setSavingVacante] = useState(false);

  // Drill-down state
  const [selectedCliente, setSelectedCliente] = useState<ClienteDB | null>(null);
  const [selectedVacanteItem, setSelectedVacanteItem] = useState<VacanteItem | null>(null);
  const [postulantes, setPostulantes] = useState<PostulanteRow[]>([]);
  const [loadingPostulantes, setLoadingPostulantes] = useState(false);
  const [selectedPostulante, setSelectedPostulante] = useState<PostulanteRow | null>(null);

  // Fetch manual vacantes for selected client (matched by client name)
  const fetchManualVacantes = useCallback(async (clienteNombre: string) => {
    const { data } = await supabase
      .from('vacantes')
      .select('*')
      .eq('cliente', clienteNombre)
      .order('created_at', { ascending: false });
    setManualVacantes(((data ?? []) as unknown) as VacanteManual[]);
  }, []);

  useEffect(() => {
    if (selectedCliente) fetchManualVacantes(selectedCliente.nombre);
    else setManualVacantes([]);
  }, [selectedCliente, fetchManualVacantes]);

  // Build unified vacantes list for selected client
  const clienteVacantesUnified: VacanteItem[] = selectedCliente
    ? [
        ...manualVacantes.map(v => ({
          id: v.id,
          cargo: v.cargo,
          ubicacion: v.ubicacion,
          tipo: v.tipo,
          estado: v.estado,
          postulantes: 0, // will count below
          source: 'manual' as const,
        })),
        ...autoVacantes
          .filter(v => v.clienteNombre.toLowerCase() === selectedCliente.nombre.toLowerCase())
          .map(v => ({
            id: v.id,
            cargo: v.cargo,
            ubicacion: v.ubicacion,
            tipo: v.tipo,
            estado: v.estado,
            postulantes: v.postulantes,
            source: 'auto' as const,
          })),
      ]
    : [];

  // Fetch postulantes when a vacante is selected
  useEffect(() => {
    if (!selectedVacanteItem) { setPostulantes([]); return; }
    const load = async () => {
      setLoadingPostulantes(true);
      const { data } = await supabase
        .from('postulantes')
        .select('id,nombre,email,telefono,profesion,experiencia,pretension_renta,habilidades,estado_pipeline,match_score,notas,fecha_postulacion')
        .eq('vacante_origen', selectedVacanteItem.cargo)
        .order('fecha_postulacion', { ascending: false });
      setPostulantes((data as PostulanteRow[]) || []);
      setLoadingPostulantes(false);
    };
    load();
  }, [selectedVacanteItem]);

  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    const ok = await addCliente(form);
    setSaving(false);
    if (ok) {
      showToast('¡Cliente creado exitosamente!');
      setForm({ nombre: '', industria: '', contacto: '', email: '' });
      setIsCreateOpen(false);
    } else {
      showToast('Error al crear cliente');
    }
  };

  const handleCreateVacante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacanteForm.cargo.trim() || !selectedCliente) return;
    setSavingVacante(true);
    const { error } = await supabase.from('vacantes').insert({
      cargo: vacanteForm.cargo.trim(),
      cliente_id: selectedCliente.id,
      tipo: vacanteForm.tipo,
      ubicacion: vacanteForm.ubicacion,
      renta: vacanteForm.renta,
      responsable_id: vacanteForm.responsableId,
    } as any);
    setSavingVacante(false);
    if (!error) {
      showToast('¡Vacante creada exitosamente!');
      setVacanteForm({ cargo: '', tipo: 'Reclutamiento', ubicacion: '', renta: '', responsableId: 'JRB' });
      setIsVacanteModalOpen(false);
      fetchManualVacantes(selectedCliente.id);
    } else {
      showToast('Error al crear vacante');
    }
  };

  const handleBack = () => {
    if (selectedPostulante) { setSelectedPostulante(null); return; }
    if (selectedVacanteItem) { setSelectedVacanteItem(null); return; }
    if (selectedCliente) { setSelectedCliente(null); return; }
  };

  // ─── Perfil de postulante ───
  if (selectedPostulante) {
    const p = selectedPostulante;
    return (
      <div style={{ animation: 'fadeSlide 0.3s' }}>
        <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          {Icons.arrowLeft} <span>Volver a postulantes</span>
        </button>
        <div className="bg-card rounded-2xl border border-border p-8 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center">
              {p.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{formatName(p.nombre)}</h2>
              <p className="text-sm text-muted-foreground">{p.profesion || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-1">{p.email || '—'}</span></div>
            <div><span className="text-muted-foreground">Teléfono:</span> <span className="text-foreground ml-1">{p.telefono || '—'}</span></div>
            <div><span className="text-muted-foreground">Experiencia:</span> <span className="text-foreground ml-1">{p.experiencia || '—'}</span></div>
            <div><span className="text-muted-foreground">Pretensión:</span> <span className="text-foreground ml-1">{p.pretension_renta || '—'}</span></div>
            <div><span className="text-muted-foreground">Match:</span> <span className="text-foreground ml-1">{p.match_score ?? '—'}%</span></div>
            <div><span className="text-muted-foreground">Fecha:</span> <span className="text-foreground ml-1">{p.fecha_postulacion ? new Date(p.fecha_postulacion).toLocaleDateString('es-CL') : '—'}</span></div>
          </div>
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">Estado:</span>
            <select
              className={`${inputClass} mt-1`}
              value={p.estado_pipeline || ''}
              onChange={async (e) => {
                const nuevoEstado = e.target.value;
                const { error } = await supabase.from('postulantes').update({ estado_pipeline: nuevoEstado } as any).eq('id', p.id);
                if (!error) {
                  setSelectedPostulante({ ...p, estado_pipeline: nuevoEstado });
                  setPostulantes(prev => prev.map(x => x.id === p.id ? { ...x, estado_pipeline: nuevoEstado } : x));
                  showToast(`Estado actualizado a "${nuevoEstado}"`);
                }
              }}
            >
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {p.habilidades && p.habilidades.length > 0 && (
            <div className="mb-4">
              <span className="text-sm text-muted-foreground block mb-2">Habilidades:</span>
              <div className="flex flex-wrap gap-1.5">
                {p.habilidades.map((h, i) => <AtsBadge key={i} color="blue">{h}</AtsBadge>)}
              </div>
            </div>
          )}
          {p.notas && (
            <div>
              <span className="text-sm text-muted-foreground block mb-1">Notas:</span>
              <p className="text-sm text-foreground bg-muted rounded-lg p-3">{p.notas}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Lista de postulantes de una vacante ───
  if (selectedVacanteItem && selectedCliente) {
    return (
      <div style={{ animation: 'fadeSlide 0.3s' }}>
        <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          {Icons.arrowLeft} <span>Volver a vacantes de {selectedCliente.nombre}</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-1">{selectedVacanteItem.cargo}</h1>
        <p className="text-sm text-muted-foreground mb-6">{postulantes.length} postulantes · {selectedCliente.nombre}</p>
        {loadingPostulantes ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : postulantes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No hay postulantes para esta vacante.</p>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
              </tr></thead>
              <tbody>
                {postulantes.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPostulante(p)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{formatName(p.nombre)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email || '—'}</td>
                    <td className="px-4 py-3">
                      <AtsBadge color={p.estado_pipeline === 'Contratado' ? 'green' : p.estado_pipeline === 'Descartado' ? 'red' : 'blue'}>
                        {p.estado_pipeline || '—'}
                      </AtsBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.fecha_postulacion ? new Date(p.fecha_postulacion).toLocaleDateString('es-CL') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ─── Detalle de cliente con vacantes ───
  if (selectedCliente) {
    const c = selectedCliente;
    return (
      <div style={{ animation: 'fadeSlide 0.3s' }}>
        <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          {Icons.arrowLeft} <span>Volver a clientes</span>
        </button>
        <div className="bg-card rounded-2xl border border-border p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary text-lg font-bold flex items-center justify-center">
              {c.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{c.nombre}</h1>
              <div className="flex items-center gap-3 mt-1">
                <AtsBadge color={c.estado === 'Activo' ? 'green' : 'red'}>{c.estado}</AtsBadge>
                <span className="text-sm text-muted-foreground">{c.industria || '—'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            {c.contacto && <div><span className="text-muted-foreground">Contacto:</span> <span className="text-foreground ml-1">{c.contacto}</span></div>}
            {c.email && <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-1">{c.email}</span></div>}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Vacantes asociadas ({clienteVacantesUnified.length})</h2>
          <AtsButton icon={Icons.plus} small onClick={() => setIsVacanteModalOpen(true)}>Agregar Vacante</AtsButton>
        </div>
        {clienteVacantesUnified.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted rounded-xl p-6 text-center">No hay vacantes asociadas a este cliente.</p>
        ) : (
          <div className="grid gap-3">
            {clienteVacantesUnified.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVacanteItem(v)}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{v.cargo}</h3>
                    {v.source === 'manual' && <AtsBadge color="purple">Manual</AtsBadge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {v.ubicacion && <><span>📍 {v.ubicacion}</span><span>·</span></>}
                    <span>{v.tipo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{v.postulantes} postulantes</span>
                  <AtsBadge color="green">{v.estado}</AtsBadge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal crear vacante */}
        <AppModal isOpen={isVacanteModalOpen} onClose={() => setIsVacanteModalOpen(false)} title={`Nueva Vacante — ${c.nombre}`}>
          <form onSubmit={handleCreateVacante} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Seleccionar vacante existente o crear nueva</label>
              <select
                className={inputClass}
                value={vacanteForm.cargo}
                onChange={e => {
                  const selected = e.target.value;
                  if (selected === '__manual__') {
                    setVacanteForm({ cargo: '', tipo: 'Reclutamiento', ubicacion: '', renta: '', responsableId: 'JRB' });
                    return;
                  }
                  const match = autoVacantes.find(v => v.cargo === selected);
                  if (match) {
                    setVacanteForm({
                      cargo: match.cargo,
                      tipo: match.tipo,
                      ubicacion: match.ubicacion,
                      renta: '',
                      responsableId: match.responsableId,
                    });
                  }
                }}
              >
                <option value="">— Selecciona una vacante —</option>
                {autoVacantes.map(v => (
                  <option key={v.id} value={v.cargo}>{v.cargo} ({v.postulantes} postulantes)</option>
                ))}
                <option value="__manual__">✏️ Crear cargo nuevo manualmente</option>
              </select>
            </div>
            {(vacanteForm.cargo === '' || !autoVacantes.some(v => v.cargo === vacanteForm.cargo)) && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cargo *</label>
                <input className={inputClass} placeholder="Ej: Desarrollador Fullstack" value={vacanteForm.cargo} onChange={e => setVacanteForm({ ...vacanteForm, cargo: e.target.value })} required />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tipo de Servicio</label>
                <select className={inputClass} value={vacanteForm.tipo} onChange={e => setVacanteForm({ ...vacanteForm, tipo: e.target.value })}>
                  <option>Reclutamiento</option><option>EST</option><option>Outsourcing</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Responsable</label>
                <select className={inputClass} value={vacanteForm.responsableId} onChange={e => setVacanteForm({ ...vacanteForm, responsableId: e.target.value })}>
                  {RESPONSABLES.map(r => <option key={r.id} value={r.id}>{r.iniciales} — {r.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Ubicación</label>
                <input className={inputClass} placeholder="Ej: Santiago / Remoto" value={vacanteForm.ubicacion} onChange={e => setVacanteForm({ ...vacanteForm, ubicacion: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Renta (CLP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input className={`${inputClass} pl-7`} placeholder="Ej: 600.000" value={vacanteForm.renta} onChange={e => {
                    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    setVacanteForm({ ...vacanteForm, renta: formatted });
                  }} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsVacanteModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors">Cancelar</button>
              <button type="submit" disabled={savingVacante} className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50">
                {savingVacante ? 'Guardando...' : 'Crear Vacante'}
              </button>
            </div>
          </form>
        </AppModal>
      </div>
    );
  }

  // ─── Lista de clientes ───
  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Empresas con contratos activos de servicios.</p>
        </div>
        <AtsButton icon={Icons.plus} onClick={() => setIsCreateOpen(true)}>Nuevo Cliente</AtsButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map(c => {
            const numVacantes = autoVacantes.filter(v => v.clienteNombre.toLowerCase() === c.nombre.toLowerCase()).length;
            return (
              <div key={c.id} className="bg-card rounded-2xl p-6 border border-border transition-all hover:shadow-md hover:border-primary/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                    {c.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <AtsBadge color={c.estado === 'Activo' ? 'green' : 'red'}>{c.estado}</AtsBadge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{c.nombre}</h3>
                <p className="text-xs text-muted-foreground mb-1">{c.industria || '—'}</p>
                <p className="text-xs text-muted-foreground mb-3">{numVacantes} vacantes</p>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-4">
                  {c.contacto && <span>👤 {c.contacto}</span>}
                  {c.email && <span>✉️ {c.email}</span>}
                </div>
                <AtsButton variant="secondary" small style={{ width: '100%' }} onClick={() => setSelectedCliente(c)}>Ver Detalle</AtsButton>
              </div>
            );
          })}
        </div>
      )}

      <AppModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo Cliente">
        <form onSubmit={handleCreateCliente} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nombre de la empresa *</label>
            <input className={inputClass} placeholder="Ej: Acme Corp" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Industria</label>
            <input className={inputClass} placeholder="Ej: Tecnología, Retail, Logística" value={form.industria} onChange={e => setForm({ ...form, industria: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Contacto</label>
              <input className={inputClass} placeholder="Nombre del contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
              <input className={inputClass} type="email" placeholder="email@empresa.cl" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
};

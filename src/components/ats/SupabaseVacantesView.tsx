import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AtsButton } from './AtsButton';
import { AtsBadge } from './AtsBadge';
import { AppModal } from './AppModal';
import { Icons } from './Icons';

export interface VacanteSupabase {
  id: string;
  nombre_vacante: string;
  cliente: string | null;
  whatsapp_activo: boolean;
  mensaje_inicial: string | null;
  mensaje_entrevista: string | null;
  palabras_clave: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Props {
  showToast: (msg: string) => void;
}

const inputClass =
  'w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

const textareaClass =
  'w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y min-h-[110px] font-sans';

export const SupabaseVacantesView: React.FC<Props> = ({ showToast }) => {
  const [vacantes, setVacantes] = useState<VacanteSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VacanteSupabase | null>(null);
  const [editForm, setEditForm] = useState({ mensaje_inicial: '', mensaje_entrevista: '', palabras_clave: '' });
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    nombre_vacante: '',
    cliente: '',
    whatsapp_activo: false,
    mensaje_inicial: '',
    mensaje_entrevista: '',
    palabras_clave: '',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vacantes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast(`Error cargando vacantes: ${error.message}`);
    } else {
      setVacantes((data ?? []) as VacanteSupabase[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleWhatsapp = async (v: VacanteSupabase) => {
    const nuevo = !v.whatsapp_activo;
    // Optimistic update
    setVacantes(prev => prev.map(x => (x.id === v.id ? { ...x, whatsapp_activo: nuevo } : x)));
    const { error } = await supabase
      .from('vacantes')
      .update({ whatsapp_activo: nuevo, updated_at: new Date().toISOString() })
      .eq('id', v.id);
    if (error) {
      // revert
      setVacantes(prev => prev.map(x => (x.id === v.id ? { ...x, whatsapp_activo: !nuevo } : x)));
      showToast(`Error: ${error.message}`);
    } else {
      showToast(`WhatsApp ${nuevo ? 'activado' : 'desactivado'} para ${v.nombre_vacante}`);
    }
  };

  const openEdit = (v: VacanteSupabase) => {
    setEditing(v);
    setEditForm({
      mensaje_inicial: v.mensaje_inicial ?? '',
      mensaje_entrevista: v.mensaje_entrevista ?? '',
      palabras_clave: v.palabras_clave ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('vacantes')
      .update({
        mensaje_inicial: editForm.mensaje_inicial,
        mensaje_entrevista: editForm.mensaje_entrevista,
        palabras_clave: editForm.palabras_clave,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    showToast('Mensajes actualizados');
    setEditing(null);
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.nombre_vacante.trim()) {
      showToast('El nombre de la vacante es obligatorio');
      return;
    }
    const { error } = await supabase.from('vacantes').insert({
      nombre_vacante: newForm.nombre_vacante.trim(),
      cliente: newForm.cliente.trim() || null,
      whatsapp_activo: newForm.whatsapp_activo,
      mensaje_inicial: newForm.mensaje_inicial || null,
      mensaje_entrevista: newForm.mensaje_entrevista || null,
      palabras_clave: newForm.palabras_clave || null,
    });
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    showToast('Vacante creada');
    setCreateOpen(false);
    setNewForm({
      nombre_vacante: '',
      cliente: '',
      whatsapp_activo: false,
      mensaje_inicial: '',
      mensaje_entrevista: '',
      palabras_clave: '',
    });
    load();
  };

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestión de Vacantes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Cargando…' : `${vacantes.length} vacante${vacantes.length === 1 ? '' : 's'} registrada${vacantes.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <AtsButton icon={Icons.plus} onClick={() => setCreateOpen(true)}>
          Nueva Vacante
        </AtsButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : vacantes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No hay vacantes registradas todavía.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Vacante', 'Cliente', 'WhatsApp', 'Estado bot', 'Acciones'].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacantes.map(v => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{v.nombre_vacante}</p>
                    {v.palabras_clave && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[320px]">
                        {v.palabras_clave}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-muted-foreground">{v.cliente || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <AtsBadge color={v.whatsapp_activo ? 'green' : 'gray'}>
                      {v.whatsapp_activo ? 'WhatsApp ON' : 'WhatsApp OFF'}
                    </AtsBadge>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      role="switch"
                      aria-checked={v.whatsapp_activo}
                      onClick={() => handleToggleWhatsapp(v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-none cursor-pointer ${
                        v.whatsapp_activo ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                      title={v.whatsapp_activo ? 'Desactivar bot' : 'Activar bot'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          v.whatsapp_activo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <AtsButton variant="secondary" small onClick={() => openEdit(v)}>
                      Editar Mensajes
                    </AtsButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit messages modal */}
      <AppModal
        isOpen={!!editing}
        onClose={() => (saving ? null : setEditing(null))}
        title={editing ? `Editar Mensajes — ${editing.nombre_vacante}` : 'Editar Mensajes'}
        width={640}
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Mensaje inicial (primer contacto)
              </label>
              <textarea
                className={textareaClass}
                placeholder="Hola {nombre}, te contactamos por la vacante…"
                value={editForm.mensaje_inicial}
                onChange={e => setEditForm({ ...editForm, mensaje_inicial: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Mensaje de entrevista
              </label>
              <textarea
                className={textareaClass}
                placeholder="¡Felicitaciones! Tu entrevista quedó agendada…"
                value={editForm.mensaje_entrevista}
                onChange={e => setEditForm({ ...editForm, mensaje_entrevista: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Palabras clave (separadas por coma)
              </label>
              <input
                className={inputClass}
                placeholder="operario, producción, turno"
                value={editForm.palabras_clave}
                onChange={e => setEditForm({ ...editForm, palabras_clave: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </AppModal>

      {/* Create modal */}
      <AppModal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nueva Vacante" width={640}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nombre de la vacante *</label>
              <input
                className={inputClass}
                required
                placeholder="Ej: Operario Producción"
                value={newForm.nombre_vacante}
                onChange={e => setNewForm({ ...newForm, nombre_vacante: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cliente</label>
              <input
                className={inputClass}
                placeholder="Ej: Alval"
                value={newForm.cliente}
                onChange={e => setNewForm({ ...newForm, cliente: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Mensaje inicial</label>
            <textarea
              className={textareaClass}
              placeholder="Hola {nombre}, te contactamos por la vacante…"
              value={newForm.mensaje_inicial}
              onChange={e => setNewForm({ ...newForm, mensaje_inicial: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Mensaje de entrevista</label>
            <textarea
              className={textareaClass}
              placeholder="¡Felicitaciones! Tu entrevista quedó agendada…"
              value={newForm.mensaje_entrevista}
              onChange={e => setNewForm({ ...newForm, mensaje_entrevista: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Palabras clave (separadas por coma)
            </label>
            <input
              className={inputClass}
              placeholder="operario, producción, turno"
              value={newForm.palabras_clave}
              onChange={e => setNewForm({ ...newForm, palabras_clave: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-border transition-colors">
            <input
              type="checkbox"
              className="accent-primary w-4 h-4"
              checked={newForm.whatsapp_activo}
              onChange={e => setNewForm({ ...newForm, whatsapp_activo: e.target.checked })}
            />
            <span className="text-sm font-medium text-foreground">Activar WhatsApp bot al crear</span>
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md"
            >
              Crear Vacante
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
};

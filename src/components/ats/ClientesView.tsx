import React, { useState } from 'react';
import { useClientes } from '@/hooks/useClientes';
import { AtsBadge } from './AtsBadge';
import { AtsButton } from './AtsButton';
import { AppModal } from './AppModal';
import { Icons } from './Icons';

interface ClientesViewProps {
  showToast: (msg: string) => void;
}

const inputClass = "w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

export const ClientesView: React.FC<ClientesViewProps> = ({ showToast }) => {
  const { clientes, loading, addCliente } = useClientes();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', industria: '', contacto: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    const ok = await addCliente(form);
    setSaving(false);
    if (ok) {
      showToast('¡Cliente creado exitosamente!');
      setForm({ nombre: '', industria: '', contacto: '', email: '' });
      setIsOpen(false);
    } else {
      showToast('Error al crear cliente');
    }
  };

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Empresas con contratos activos de servicios.</p>
        </div>
        <AtsButton icon={Icons.plus} onClick={() => setIsOpen(true)}>Nuevo Cliente</AtsButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map(c => (
            <div key={c.id} className="bg-card rounded-2xl p-6 border border-border transition-all hover:shadow-md hover:border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                  {c.nombre.slice(0, 2).toUpperCase()}
                </div>
                <AtsBadge color={c.estado === 'Activo' ? 'green' : 'red'}>{c.estado}</AtsBadge>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{c.nombre}</h3>
              <p className="text-xs text-muted-foreground mb-3">{c.industria || '—'}</p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-4">
                {c.contacto && <span>👤 {c.contacto}</span>}
                {c.email && <span>✉️ {c.email}</span>}
              </div>
              <AtsButton variant="secondary" small style={{ width: '100%' }} onClick={() => showToast(`Ver detalle de ${c.nombre}`)}>Ver Detalle</AtsButton>
            </div>
          ))}
        </div>
      )}

      <AppModal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nuevo Cliente">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
};

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';

type EtapaComercial = 'Prospecto' | 'Contactado' | 'Reunión Agendada' | 'Propuesta Enviada' | 'Negociación' | 'Cliente Activo' | 'Descartado';

interface LeadComercial {
  id: string;
  empresa: string;
  contacto: string;
  email?: string;
  telefono?: string;
  origen?: string;
  etapa: EtapaComercial;
  notas?: string;
  createdAt: string;
}

const ETAPAS: { id: EtapaComercial; label: string; color: string }[] = [
  { id: 'Prospecto', label: 'Prospectos Nuevos', color: 'hsl(220, 85%, 55%)' },
  { id: 'Contactado', label: 'Contactado', color: 'hsl(200, 80%, 50%)' },
  { id: 'Reunión Agendada', label: 'Reunión Agendada', color: 'hsl(45, 90%, 50%)' },
  { id: 'Propuesta Enviada', label: 'Propuesta Enviada', color: 'hsl(280, 60%, 55%)' },
  { id: 'Negociación', label: 'Negociación', color: 'hsl(25, 90%, 55%)' },
  { id: 'Cliente Activo', label: 'Cliente Activo', color: 'hsl(150, 60%, 45%)' },
  { id: 'Descartado', label: 'Descartado', color: 'hsl(0, 0%, 55%)' },
];

const STORAGE_KEY = 'nodo_comercial_pipeline';

const loadLeads = (): LeadComercial[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {/* ignore */}
  return [];
};

const saveLeads = (leads: LeadComercial[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(leads)); } catch {/* ignore */}
};

export const ComercialPipelineView: React.FC = () => {
  const [leads, setLeads] = useState<LeadComercial[]>(loadLeads);
  const [showForm, setShowForm] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { showToast } = useAppToast();
  const [form, setForm] = useState<Omit<LeadComercial, 'id' | 'createdAt' | 'etapa'>>({
    empresa: '', contacto: '', email: '', telefono: '', origen: '', notas: '',
  });

  const persist = (next: LeadComercial[]) => { setLeads(next); saveLeads(next); };

  const addLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empresa.trim()) return;
    const nuevo: LeadComercial = {
      id: `lead-${Date.now()}`,
      ...form,
      etapa: 'Prospecto',
      createdAt: new Date().toISOString(),
    };
    persist([nuevo, ...leads]);
    setForm({ empresa: '', contacto: '', email: '', telefono: '', origen: '', notas: '' });
    setShowForm(false);
  };

  const syncClienteActivo = async (lead: LeadComercial) => {
    const nombre = lead.empresa.trim();
    if (!nombre) return;
    try {
      // Buscar cliente existente por nombre (case-insensitive)
      const { data: existentes } = await supabase
        .from('clientes')
        .select('id, nombre, contacto, email, estado')
        .ilike('nombre', nombre);

      const match = (existentes ?? []).find(
        c => c.nombre.trim().toLowerCase() === nombre.toLowerCase()
      );

      if (match) {
        // Actualizar datos faltantes y asegurar estado Activo
        await supabase
          .from('clientes')
          .update({
            contacto: match.contacto || lead.contacto || null,
            email: match.email || lead.email || null,
            estado: 'Activo',
          })
          .eq('id', match.id);
        showToast(`✅ Cliente "${nombre}" actualizado en el directorio`);
      } else {
        // Crear nuevo cliente
        const { error } = await supabase.from('clientes').insert({
          nombre,
          contacto: lead.contacto || null,
          email: lead.email || null,
          industria: lead.origen || null,
          estado: 'Activo',
        });
        if (error) throw error;
        showToast(`✅ Cliente "${nombre}" creado en el directorio`);
      }

      // Asociar vacantes existentes que coincidan por nombre de cliente (texto)
      // Nota: la tabla vacantes vincula por columna `cliente` (text)
      await supabase
        .from('vacantes')
        .update({ cliente: nombre })
        .ilike('cliente', nombre);
    } catch (e) {
      console.error('Error sincronizando cliente:', e);
      showToast('⚠️ No se pudo sincronizar con el directorio de clientes');
    }
  };

  const moveLead = (id: string, etapa: EtapaComercial) => {
    const lead = leads.find(l => l.id === id);
    persist(leads.map(l => l.id === id ? { ...l, etapa } : l));
    if (lead && etapa === 'Cliente Activo' && lead.etapa !== 'Cliente Activo') {
      syncClienteActivo({ ...lead, etapa });
    }
  };

  const deleteLead = (id: string) => {
    if (!confirm('¿Eliminar este lead?')) return;
    persist(leads.filter(l => l.id !== id));
  };

  const inputClass = "w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Comercial</p>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Seguimiento de prospectos y posibles clientes desde primer contacto hasta cierre.</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Prospecto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addLead} className="bg-card border border-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Empresa *</label>
            <input className={inputClass} value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Contacto</label>
            <input className={inputClass} value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Teléfono</label>
            <input className={inputClass} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Origen</label>
            <input className={inputClass} placeholder="Referido, LinkedIn, web..." value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Notas</label>
            <textarea className={inputClass} rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md">Guardar prospecto</button>
          </div>
        </form>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {ETAPAS.map(et => {
            const items = leads.filter(l => l.etapa === et.id);
            return (
              <div
                key={et.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (draggingId) { moveLead(draggingId, et.id); setDraggingId(null); } }}
                className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl border border-border"
              >
                <div className="px-3 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: et.color }} />
                    <span className="text-xs font-semibold text-foreground">{et.label}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-card px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2 p-2 min-h-[200px]">
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic text-center py-6">Sin leads</p>
                  )}
                  {items.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggingId(lead.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className="bg-card border border-border rounded-lg p-3 cursor-move hover:border-primary/40 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{lead.empresa}</p>
                        <button
                          onClick={() => deleteLead(lead.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                      {lead.contacto && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.contacto}</p>}
                      {lead.email && <p className="text-[11px] text-muted-foreground truncate">{lead.email}</p>}
                      {lead.telefono && <p className="text-[11px] text-muted-foreground">{lead.telefono}</p>}
                      {lead.origen && (
                        <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {lead.origen}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">Arrastra las tarjetas entre columnas para actualizar la etapa. Datos guardados localmente en este navegador.</p>
    </div>
  );
};

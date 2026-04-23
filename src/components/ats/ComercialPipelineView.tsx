import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import {
  useLeadsComerciales,
  type EtapaComercial,
  type LeadComercialDB,
  type PrioridadLead,
} from '@/hooks/useLeadsComerciales';

const ETAPAS: { id: EtapaComercial; label: string; color: string }[] = [
  { id: 'Prospecto', label: 'Prospectos Nuevos', color: 'hsl(220, 85%, 55%)' },
  { id: 'Contactado', label: 'Contactado', color: 'hsl(200, 80%, 50%)' },
  { id: 'Reunión Agendada', label: 'Reunión Agendada', color: 'hsl(45, 90%, 50%)' },
  { id: 'Propuesta Enviada', label: 'Propuesta Enviada', color: 'hsl(280, 60%, 55%)' },
  { id: 'Negociación', label: 'Negociación', color: 'hsl(25, 90%, 55%)' },
  { id: 'Cliente Activo', label: 'Cliente Activo', color: 'hsl(150, 60%, 45%)' },
  { id: 'Descartado', label: 'Descartado', color: 'hsl(0, 0%, 55%)' },
];

const TIPOS = [
  'Productor de alimentos',
  'Maquila',
  'Co-packing',
  'Envasado',
  'Food service',
  'Bebidas',
] as const;

const PRIORIDADES: PrioridadLead[] = ['Alta', 'Media', 'Baja'];

const prioridadStyle = (p: PrioridadLead) => {
  switch (p) {
    case 'Alta':
      return 'bg-destructive/10 text-destructive border border-destructive/20';
    case 'Media':
      return 'bg-primary/10 text-primary border border-primary/20';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
};

export const ComercialPipelineView: React.FC = () => {
  const { leads, loading, refetch, addLead, updateEtapa, deleteLead } =
    useLeadsComerciales();
  const { show: showToast } = useAppToast();
  const [showForm, setShowForm] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState<'Todas' | PrioridadLead>('Todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');

  const [form, setForm] = useState({
    empresa: '',
    contacto: '',
    cargo: '',
    email: '',
    telefono: '',
    tipo_empresa: 'Productor de alimentos' as string,
    ciudad: 'Santiago',
    comuna: '',
    region: 'Metropolitana',
    pais: 'Chile',
    sitio_web: '',
    prioridad: 'Media' as PrioridadLead,
    origen: '',
    estado_verificacion: 'No verificado',
    notas: '',
  });

  const leadsFiltrados = useMemo(() => {
    return leads.filter(l => {
      if (filtroPrioridad !== 'Todas' && l.prioridad !== filtroPrioridad) return false;
      if (filtroTipo !== 'Todos' && l.tipo_empresa !== filtroTipo) return false;
      return true;
    });
  }, [leads, filtroPrioridad, filtroTipo]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empresa.trim()) return;
    const { ok, error } = await addLead({
      ...form,
      empresa: form.empresa.trim(),
      etapa: 'Prospecto',
    });
    if (ok) {
      showToast(`✅ Lead "${form.empresa}" creado`);
      setForm({
        empresa: '', contacto: '', cargo: '', email: '', telefono: '',
        tipo_empresa: 'Productor de alimentos', ciudad: 'Santiago', comuna: '',
        region: 'Metropolitana', pais: 'Chile', sitio_web: '',
        prioridad: 'Media', origen: '', estado_verificacion: 'No verificado', notas: '',
      });
      setShowForm(false);
    } else {
      const msg = (error as any)?.message?.includes('idx_leads_comerciales_empresa_unique')
        ? '⚠️ Ya existe un lead con ese nombre de empresa'
        : '⚠️ No se pudo crear el lead';
      showToast(msg);
    }
  };

  const syncClienteActivo = async (lead: LeadComercialDB) => {
    const nombre = lead.empresa.trim();
    if (!nombre) return;
    try {
      const { data: existentes } = await supabase
        .from('clientes')
        .select('id, nombre, contacto, email, estado')
        .ilike('nombre', nombre);
      const match = (existentes ?? []).find(
        c => c.nombre.trim().toLowerCase() === nombre.toLowerCase()
      );
      if (match) {
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
        const { error } = await supabase.from('clientes').insert({
          nombre,
          contacto: lead.contacto || null,
          email: lead.email || null,
          industria: lead.tipo_empresa || null,
          estado: 'Activo',
        });
        if (error) throw error;
        showToast(`✅ Cliente "${nombre}" creado en el directorio`);
      }
      await supabase.from('vacantes').update({ cliente: nombre }).ilike('cliente', nombre);
    } catch (e) {
      console.error('Error sincronizando cliente:', e);
      showToast('⚠️ No se pudo sincronizar con el directorio de clientes');
    }
  };

  const moveLead = async (id: string, etapa: EtapaComercial) => {
    const lead = leads.find(l => l.id === id);
    const ok = await updateEtapa(id, etapa);
    if (ok && lead && etapa === 'Cliente Activo' && lead.etapa !== 'Cliente Activo') {
      syncClienteActivo({ ...lead, etapa });
    }
  };

  const handleDelete = async (id: string, empresa: string) => {
    if (!confirm(`¿Eliminar el lead "${empresa}"?`)) return;
    const ok = await deleteLead(id);
    if (ok) showToast(`🗑️ Lead "${empresa}" eliminado`);
  };

  const inputClass =
    'w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

  const totalAlta = leads.filter(l => l.prioridad === 'Alta').length;
  const totalMedia = leads.filter(l => l.prioridad === 'Media').length;
  const totalBaja = leads.filter(l => l.prioridad === 'Baja').length;

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Comercial
          </p>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seguimiento de prospectos y posibles clientes desde primer contacto hasta cierre.
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Prospecto'}
        </button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Total leads</p>
          <p className="text-2xl font-bold text-foreground">{leads.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[11px] font-semibold uppercase text-destructive">Prioridad Alta</p>
          <p className="text-2xl font-bold text-foreground">{totalAlta}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[11px] font-semibold uppercase text-primary">Prioridad Media</p>
          <p className="text-2xl font-bold text-foreground">{totalMedia}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Prioridad Baja</p>
          <p className="text-2xl font-bold text-foreground">{totalBaja}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Filtrar:</span>
        <select
          value={filtroPrioridad}
          onChange={e => setFiltroPrioridad(e.target.value as any)}
          className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs"
        >
          <option value="Todas">Todas las prioridades</option>
          {PRIORIDADES.map(p => (
            <option key={p} value={p}>Prioridad {p}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs"
        >
          <option value="Todos">Todos los tipos</option>
          {TIPOS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ↻ Refrescar
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="bg-card border border-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Empresa *
            </label>
            <input
              className={inputClass}
              value={form.empresa}
              onChange={e => setForm({ ...form, empresa: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Tipo de empresa
            </label>
            <select
              className={inputClass}
              value={form.tipo_empresa}
              onChange={e => setForm({ ...form, tipo_empresa: e.target.value })}
            >
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Contacto</label>
            <input className={inputClass} value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cargo</label>
            <input className={inputClass} value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Prioridad</label>
            <select
              className={inputClass}
              value={form.prioridad}
              onChange={e => setForm({ ...form, prioridad: e.target.value as PrioridadLead })}
            >
              {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
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
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Sitio web</label>
            <input className={inputClass} value={form.sitio_web} onChange={e => setForm({ ...form, sitio_web: e.target.value })} placeholder="empresa.cl" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Ciudad</label>
            <input className={inputClass} value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Comuna / zona</label>
            <input className={inputClass} value={form.comuna} onChange={e => setForm({ ...form, comuna: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Región</label>
            <input className={inputClass} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Fuente</label>
            <input className={inputClass} value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} placeholder="Sitio web, referido, LinkedIn..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Verificación</label>
            <select
              className={inputClass}
              value={form.estado_verificacion}
              onChange={e => setForm({ ...form, estado_verificacion: e.target.value })}
            >
              <option>No verificado</option>
              <option>Parcialmente verificado</option>
              <option>Verificado públicamente</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Notas comerciales</label>
            <textarea className={inputClass} rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md"
            >
              Guardar prospecto
            </button>
          </div>
        </form>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto">
        {loading && (
          <p className="text-sm text-muted-foreground italic mb-2">Cargando leads…</p>
        )}
        <div className="flex gap-4 min-w-max pb-2">
          {ETAPAS.map(et => {
            const items = leadsFiltrados.filter(l => l.etapa === et.id);
            return (
              <div
                key={et.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (draggingId) {
                    moveLead(draggingId, et.id);
                    setDraggingId(null);
                  }
                }}
                className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl border border-border"
              >
                <div className="px-3 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: et.color }} />
                    <span className="text-xs font-semibold text-foreground">{et.label}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-card px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-2 min-h-[200px]">
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic text-center py-6">
                      Sin leads
                    </p>
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
                        <p className="text-sm font-semibold text-foreground truncate">
                          {lead.empresa}
                        </p>
                        <button
                          onClick={() => handleDelete(lead.id, lead.empresa)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prioridadStyle(lead.prioridad)}`}>
                          {lead.prioridad}
                        </span>
                        {lead.tipo_empresa && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {lead.tipo_empresa}
                          </span>
                        )}
                      </div>

                      {(lead.contacto || lead.cargo) && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          {lead.contacto}
                          {lead.contacto && lead.cargo ? ' · ' : ''}
                          {lead.cargo}
                        </p>
                      )}
                      {(lead.comuna || lead.ciudad) && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          📍 {[lead.comuna, lead.ciudad].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {lead.sitio_web && (
                        <a
                          href={lead.sitio_web.startsWith('http') ? lead.sitio_web : `https://${lead.sitio_web}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline truncate block mt-0.5"
                          onClick={e => e.stopPropagation()}
                        >
                          🔗 {lead.sitio_web}
                        </a>
                      )}
                      {lead.email && (
                        <p className="text-[11px] text-muted-foreground truncate">{lead.email}</p>
                      )}
                      {lead.telefono && (
                        <p className="text-[11px] text-muted-foreground">{lead.telefono}</p>
                      )}
                      {lead.notas && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 italic">
                          {lead.notas}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Arrastra las tarjetas entre columnas para actualizar la etapa. Datos sincronizados con Supabase.
      </p>
    </div>
  );
};

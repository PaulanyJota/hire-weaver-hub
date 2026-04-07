import React, { useState } from 'react';
import { Sidebar } from '@/components/ats/Sidebar';
import { DashboardView } from '@/components/ats/DashboardView';
import { VacantesView } from '@/components/ats/VacantesView';
import { PipelineView } from '@/components/ats/PipelineView';
import { SupabasePipelineView } from '@/components/ats/SupabasePipelineView';
import { TalentosView } from '@/components/ats/TalentosView';
import { ClientesView } from '@/components/ats/ClientesView';
import { AppModal } from '@/components/ats/AppModal';
import { ToastContainer } from '@/components/ats/ToastContainer';
import { Icons } from '@/components/ats/Icons';
import { useAppToast } from '@/hooks/useAppToast';
import { useAllPostulantes } from '@/hooks/usePostulantes';
import { INITIAL_PIPELINE, MOCK_CLIENTES, RESPONSABLES, type Vacante, type PipelineEntry } from '@/data/mockData';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedVacante, setSelectedVacante] = useState<Vacante | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineEntry[]>(INITIAL_PIPELINE);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vacanteToShare, setVacanteToShare] = useState<Vacante | null>(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const { toasts, show: showToast } = useAppToast();
  const { postulantes: allPostulantes, updateEstadoPipeline } = useAllPostulantes();
  const [newForm, setNewForm] = useState({ cargo: '', clienteId: '1', tipo: 'Reclutamiento', ubicacion: '', renta: '', responsableId: 'JRB' });

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSelectedVacante(null);
  };

  const handleUpdatePipeline = (vId: number, cId: number, stage: string) => {
    setPipelineState(prev => prev.map(p => (p.vacanteId === vId && p.candidatoId === cId) ? { ...p, etapa: stage } : p));
    showToast(`Movido a ${stage}`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const nv: Vacante = {
      id: vacantes.length + 1,
      cargo: newForm.cargo,
      clienteId: parseInt(newForm.clienteId),
      tipo: newForm.tipo,
      ubicacion: newForm.ubicacion,
      renta: newForm.renta,
      estado: 'Activa',
      fecha: new Date().toISOString().split('T')[0],
      postulantes: 0,
      responsableId: newForm.responsableId,
    };
    setVacantes([nv, ...vacantes]);
    setIsCreateModalOpen(false);
    showToast('¡Vacante creada exitosamente!');
    setNewForm({ cargo: '', clienteId: '1', tipo: 'Reclutamiento', ubicacion: '', renta: '', responsableId: 'JRB' });
  };

  const inputClass = "w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  const renderContent = () => {
    if (selectedVacante) {
      return (
        <PipelineView
          vacante={selectedVacante}
          onBack={() => setSelectedVacante(null)}
          pipelineState={pipelineState}
          updatePipeline={handleUpdatePipeline}
          showToast={showToast}
        />
      );
    }
    switch (activeTab) {
      case 'dashboard': return <DashboardView onNewVacante={() => setIsCreateModalOpen(true)} />;
      case 'vacantes': return (
        <VacantesView
          onViewPipeline={(cargo) => showToast(`Pipeline de "${cargo}" próximamente`)}
          onNewVacante={() => setIsCreateModalOpen(true)}
          showToast={showToast}
        />
      );
      case 'talentos': return <TalentosView showToast={showToast} />;
      case 'pipeline': return <SupabasePipelineView postulantes={allPostulantes} updateEstadoPipeline={updateEstadoPipeline} showToast={showToast} />;
      case 'clientes': return <ClientesView showToast={showToast} />;
      case 'settings': return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-4xl mb-4">⚙️</p>
            <h2 className="text-xl font-bold text-foreground">Ajustes</h2>
            <p className="text-sm text-muted-foreground mt-1">Configuración del sistema próximamente.</p>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeTab={activeTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSwitchTab={switchTab}
        hasSelectedVacante={!!selectedVacante}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-3 border-b border-border bg-card shrink-0">
          <div className="relative w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{Icons.search}</span>
            <input
              placeholder="Buscar vacantes, candidatos, clientes..."
              value={headerSearch}
              onChange={e => setHeaderSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted border border-transparent rounded-lg text-sm outline-none focus:bg-card focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
            {Icons.bell}
            <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-destructive" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </div>
      </main>

      {/* Create Modal */}
      <AppModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Crear Nueva Vacante">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cargo</label>
            <input className={inputClass} placeholder="Ej: Desarrollador Fullstack" value={newForm.cargo} onChange={e => setNewForm({ ...newForm, cargo: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Cliente</label>
              <select className={inputClass} value={newForm.clienteId} onChange={e => setNewForm({ ...newForm, clienteId: e.target.value })}>
                {MOCK_CLIENTES.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tipo de Servicio</label>
              <select className={inputClass} value={newForm.tipo} onChange={e => setNewForm({ ...newForm, tipo: e.target.value })}>
                <option>Reclutamiento</option><option>EST</option><option>Outsourcing</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Ubicación</label>
              <input className={inputClass} placeholder="Ej: Santiago / Remoto" value={newForm.ubicacion} onChange={e => setNewForm({ ...newForm, ubicacion: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Renta</label>
              <input className={inputClass} placeholder="Ej: $2.0M - $2.5M" value={newForm.renta} onChange={e => setNewForm({ ...newForm, renta: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Responsable</label>
            <select className={inputClass} value={newForm.responsableId} onChange={e => setNewForm({ ...newForm, responsableId: e.target.value })}>
              {RESPONSABLES.map(r => <option key={r.id} value={r.id}>{r.iniciales} — {r.nombre}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md">Crear Vacante</button>
          </div>
        </form>
      </AppModal>

      {/* Share Modal */}
      <AppModal isOpen={!!vacanteToShare} onClose={() => setVacanteToShare(null)} title="Publicar en Portales" width={480}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Selecciona los portales donde publicar <strong className="text-foreground">{vacanteToShare?.cargo}</strong>:</p>
          {['Trabajando.com', 'Chiletrabajos', 'LinkedIn', 'Indeed', 'Portal Propio'].map(portal => (
            <label key={portal} className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-border transition-colors">
              <input type="checkbox" className="accent-primary w-4 h-4" />
              <span className="text-sm font-medium text-foreground">{portal}</span>
            </label>
          ))}
          <button
            onClick={() => { showToast('Vacante publicada en portales seleccionados'); setVacanteToShare(null); }}
            className="mt-2 w-full py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md"
          >
            Publicar
          </button>
        </div>
      </AppModal>

      <ToastContainer toasts={toasts} />
    </div>
  );
};

export default Index;

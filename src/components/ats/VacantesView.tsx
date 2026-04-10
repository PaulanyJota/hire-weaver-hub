import React, { useState, useMemo } from 'react';
import { AtsButton } from './AtsButton';
import { AtsBadge } from './AtsBadge';
import { Icons } from './Icons';
import { AppModal } from './AppModal';
import { RESPONSABLES } from '@/data/mockData';
import { useVacantesReales, type VacanteReal } from '@/hooks/useVacantesReales';
import { useClientes } from '@/hooks/useClientes';
import { addClienteOverride } from '@/lib/clienteMapping';

interface VacantesViewProps {
  onViewPipeline: (cargo: string) => void;
  onNewVacante: () => void;
  showToast: (msg: string) => void;
}

const estadoColor: Record<string, string> = {
  'Activa': 'green',
  'Pausada': 'yellow',
  'Cerrada': 'gray',
};

const tipoColor: Record<string, string> = {
  'Reclutamiento': 'blue',
  'EST': 'purple',
  'Outsourcing': 'yellow',
};

const inputClass = "w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

export const VacantesView: React.FC<VacantesViewProps> = ({ onViewPipeline, onNewVacante, showToast }) => {
  const { vacantes, loading, refetch } = useVacantesReales();
  const { clientes } = useClientes();
  const [selectedResponsable, setSelectedResponsable] = useState<string | null>(null);
  const respData = selectedResponsable ? RESPONSABLES.find(r => r.id === selectedResponsable) : null;
  const respVacantes = selectedResponsable ? vacantes.filter(v => v.responsableId === selectedResponsable) : [];

  // Unassigned vacantes
  const sinCliente = useMemo(() => vacantes.filter(v => v.clienteNombre === 'Sin cliente'), [vacantes]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUnassigned, setSelectedUnassigned] = useState<VacanteReal | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const handleAssign = () => {
    if (!selectedUnassigned || !selectedClienteId) return;
    const cliente = clientes.find(c => c.id === selectedClienteId);
    if (!cliente) return;
    // Add runtime override so it takes effect immediately
    addClienteOverride(selectedUnassigned.cargo, cliente.nombre);
    refetch();
    showToast(`✅ "${selectedUnassigned.cargo}" asignado a ${cliente.nombre}`);
    setAssignModalOpen(false);
    setSelectedUnassigned(null);
    setSelectedClienteId('');
  };

  return (
    <div style={{ animation: 'fadeSlide 0.3s' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestión de Vacantes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Cargando...' : `${vacantes.length} vacantes activas · ${vacantes.reduce((s, v) => s + v.postulantes, 0)} postulantes totales`}
          </p>
        </div>
        <div className="flex gap-2">
          <AtsButton variant="secondary" icon={Icons.filter}>Filtros</AtsButton>
          <AtsButton icon={Icons.plus} onClick={onNewVacante}>Crear Vacante</AtsButton>
        </div>
      </div>

      {/* Banner de vacantes sin cliente */}
      {!loading && sinCliente.length > 0 && !dismissed && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {sinCliente.length} cargo{sinCliente.length > 1 ? 's' : ''} sin cliente asignado
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Estos cargos no coinciden con ninguna regla de asignación automática. Selecciona uno para asignarlo a un cliente.
                </p>
                <div className="flex flex-wrap gap-2">
                  {sinCliente.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedUnassigned(v);
                        setSelectedClienteId('');
                        setAssignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <span>{v.cargo}</span>
                      <span className="text-muted-foreground">({v.postulantes})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 bg-transparent border-none cursor-pointer"
              title="Ocultar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Cargo', 'Cliente', 'Responsable', 'Servicio', 'Estado', 'Postulantes', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacantes.map(v => (
                <tr
                  key={v.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{v.cargo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.ubicacion}</p>
                  </td>
                  <td className="px-5 py-4">
                    {v.clienteNombre === 'Sin cliente' ? (
                      <button
                        onClick={() => {
                          setSelectedUnassigned(v);
                          setSelectedClienteId('');
                          setAssignModalOpen(true);
                        }}
                        className="text-amber-500 text-xs font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        ⚠️ Sin cliente — Asignar
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{v.clienteNombre}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const resp = RESPONSABLES.find(r => r.id === v.responsableId);
                      return resp ? (
                        <button
                          onClick={() => setSelectedResponsable(resp.id)}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
                        >
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{resp.iniciales}</span>
                          <span className="text-sm text-muted-foreground">{resp.nombre.split(' ')[0]}</span>
                        </button>
                      ) : '—';
                    })()}
                  </td>
                  <td className="px-5 py-4">
                    <AtsBadge color={tipoColor[v.tipo] || 'gray'}>{v.tipo}</AtsBadge>
                  </td>
                  <td className="px-5 py-4">
                    <AtsBadge color={estadoColor[v.estado] || 'gray'}>{v.estado}</AtsBadge>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono font-semibold text-primary">{v.postulantes}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <AtsButton variant="ghost" icon={Icons.link} small onClick={() => showToast('Integración próximamente')} title="Integración Portales" />
                      <AtsButton variant="secondary" small onClick={() => onViewPipeline(v.cargo)}>Ver Pipeline</AtsButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Responsable */}
      <AppModal isOpen={!!selectedResponsable} onClose={() => setSelectedResponsable(null)} title={`Vacantes de ${respData?.nombre || ''}`} width={600}>
        {respData && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{respData.iniciales}</span>
              <div>
                <p className="font-semibold text-foreground">{respData.nombre}</p>
                <p className="text-xs text-muted-foreground">{respVacantes.length} vacante{respVacantes.length !== 1 ? 's' : ''} asignada{respVacantes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {respVacantes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin vacantes asignadas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {respVacantes.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{v.cargo}</p>
                      <p className="text-xs text-muted-foreground">{v.clienteNombre} · {v.ubicacion}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AtsBadge color={estadoColor[v.estado] || 'gray'}>{v.estado}</AtsBadge>
                      <span className="text-xs font-mono text-muted-foreground">{v.postulantes} post.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AppModal>

      {/* Modal asignar cliente */}
      <AppModal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Asignar cargo a cliente" width={500}>
        {selectedUnassigned && (
          <div className="flex flex-col gap-4">
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Cargo detectado</p>
              <p className="font-semibold text-foreground">{selectedUnassigned.cargo}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedUnassigned.postulantes} postulante{selectedUnassigned.postulantes !== 1 ? 's' : ''}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Selecciona el cliente</label>
              <select
                className={inputClass}
                value={selectedClienteId}
                onChange={e => setSelectedClienteId(e.target.value)}
              >
                <option value="">— Selecciona un cliente —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {selectedClienteId && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
                <p className="font-medium text-foreground mb-2">📋 Para que esta asignación sea permanente:</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Agrega una regla en <code className="bg-muted px-1.5 py-0.5 rounded text-xs">src/lib/clienteMapping.ts</code> con el patrón:
                </p>
                <pre className="bg-muted rounded-lg p-3 mt-2 text-xs text-foreground overflow-x-auto">
{`{ pattern: /^${selectedUnassigned.cargo.split(' ').slice(0, 3).join(' ')}/i, cliente: '${clientes.find(c => c.id === selectedClienteId)?.nombre}' }`}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-border transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedClienteId}
                onClick={handleAssign}
                className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
              >
                Asignar Cliente
              </button>
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
};

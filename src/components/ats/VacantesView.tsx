import React, { useState } from 'react';
import { AtsButton } from './AtsButton';
import { AtsBadge } from './AtsBadge';
import { Icons } from './Icons';
import { AppModal } from './AppModal';
import { MOCK_CLIENTES, RESPONSABLES, type Vacante } from '@/data/mockData';

interface VacantesViewProps {
  vacantes: Vacante[];
  onViewPipeline: (v: Vacante) => void;
  onNewVacante: () => void;
  onShareVacante: (v: Vacante) => void;
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

export const VacantesView: React.FC<VacantesViewProps> = ({ vacantes, onViewPipeline, onNewVacante, onShareVacante }) => {
  const [selectedResponsable, setSelectedResponsable] = useState<string | null>(null);
  const respData = selectedResponsable ? RESPONSABLES.find(r => r.id === selectedResponsable) : null;
  const respVacantes = selectedResponsable ? vacantes.filter(v => v.responsableId === selectedResponsable) : [];

  return (
  <div style={{ animation: 'fadeSlide 0.3s' }}>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestión de Vacantes</h1>
        <p className="text-sm text-muted-foreground mt-1">Procesos de Reclutamiento, Outsourcing y EST.</p>
      </div>
      <div className="flex gap-2">
        <AtsButton variant="secondary" icon={Icons.filter}>Filtros</AtsButton>
        <AtsButton icon={Icons.plus} onClick={onNewVacante}>Crear Vacante</AtsButton>
      </div>
    </div>

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
                <p className="text-xs text-muted-foreground mt-0.5">{v.ubicacion} · {v.renta}</p>
              </td>
              <td className="px-5 py-4 text-muted-foreground">
                {MOCK_CLIENTES.find(c => c.id === v.clienteId)?.nombre || '—'}
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
                  <AtsButton variant="ghost" icon={Icons.link} small onClick={() => onShareVacante(v)} title="Integración Portales" />
                  <AtsButton variant="secondary" small onClick={() => onViewPipeline(v)}>Ver Pipeline</AtsButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

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
                    <p className="text-xs text-muted-foreground">{MOCK_CLIENTES.find(c => c.id === v.clienteId)?.nombre} · {v.ubicacion}</p>
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
  </div>
  );
};

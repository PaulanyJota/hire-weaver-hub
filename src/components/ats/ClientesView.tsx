import React from 'react';
import { MOCK_CLIENTES } from '@/data/mockData';
import { AtsBadge } from './AtsBadge';
import { AtsButton } from './AtsButton';
import { Icons } from './Icons';

interface ClientesViewProps {
  showToast: (msg: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({ showToast }) => (
  <div style={{ animation: 'fadeSlide 0.3s' }}>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">Empresas con contratos activos de servicios.</p>
      </div>
      <AtsButton icon={Icons.plus} onClick={() => showToast('Formulario de nuevo cliente...')}>Nuevo Cliente</AtsButton>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {MOCK_CLIENTES.map(c => (
        <div key={c.id} className="bg-card rounded-2xl p-6 border border-border transition-all hover:shadow-md hover:border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
              {c.nombre.slice(0, 2).toUpperCase()}
            </div>
            <AtsBadge color={c.estado === 'Activo' ? 'green' : 'red'}>{c.estado}</AtsBadge>
          </div>
          <h3 className="font-semibold text-foreground mb-1">{c.nombre}</h3>
          <p className="text-xs text-muted-foreground mb-3">{c.industria}</p>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-4">
            <span>👤 {c.contacto}</span>
            <span>✉️ {c.email}</span>
          </div>
          <AtsButton variant="secondary" small style={{ width: '100%' }} onClick={() => showToast(`Ver detalle de ${c.nombre}`)}>Ver Detalle</AtsButton>
        </div>
      ))}
    </div>
  </div>
);

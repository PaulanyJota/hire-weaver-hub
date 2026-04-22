import React from 'react';
import { ClientesView } from './ClientesView';

interface Props {
  showToast: (msg: string) => void;
}

export const ComercialClientesView: React.FC<Props> = ({ showToast }) => {
  return (
    <div>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Comercial</p>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">Directorio de clientes activos y vacantes asociadas.</p>
      </div>
      <ClientesView showToast={showToast} />
    </div>
  );
};

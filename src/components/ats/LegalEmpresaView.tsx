import React from 'react';
import { Icons } from './Icons';

interface LegalEmpresaViewProps {
  nombre: string;
  rut: string;
}

export const LegalEmpresaView: React.FC<LegalEmpresaViewProps> = ({ nombre, rut }) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{nombre}</h1>
        <p className="text-sm text-muted-foreground mt-1">Dashboard legal y societario</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">RUT Empresa</p>
          <p className="text-xl font-bold text-foreground mt-2">{rut}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Razón Social</p>
          <p className="text-base font-semibold text-foreground mt-2">{nombre}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
          <p className="text-base font-semibold text-foreground mt-2">Activa</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary">{Icons.shield}</span>
          <h2 className="text-base font-bold text-foreground">Documentación Legal</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Espacio reservado para escrituras, poderes vigentes, certificados de vigencia y otros documentos legales de {nombre}. Próximamente.
        </p>
      </div>
    </div>
  );
};

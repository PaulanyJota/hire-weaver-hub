import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Icons } from './Icons';
import nodoLogo from '@/assets/nodo-logo.jpeg';

interface Props {
  onNavigate: (tab: string) => void;
}

const NOISE_PATTERNS = [
  /^Re:/i, /^Fwd:/i, /Notificacion/i, /Resumen semanal/i, /Nueva Clave/i,
  /Obtén mas Postulantes/i, /Anuncio destacado/i, /Pendiente de Confirmacion/i,
  /^API$/i, /pago realizado/i, /Flow$/i,
];

export const HomeView: React.FC<Props> = ({ onNavigate }) => {
  const [contratados, setContratados] = useState<number | null>(null);
  const [vacantesAbiertas, setVacantesAbiertas] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      // Contratados = postulantes en pipeline final (Contratado / Contratacion)
      const { count: cCount } = await supabase
        .from('postulantes')
        .select('*', { count: 'exact', head: true })
        .in('estado_pipeline', ['Contratado', 'Contratación', 'Contratacion']);
      setContratados(cCount ?? 0);

      // Vacantes abiertas = vacantes manuales activas + cargos únicos detectados
      const { data: manuales } = await supabase
        .from('vacantes')
        .select('id, estado')
        .eq('estado', 'Activa');
      const { data: origenes } = await supabase
        .from('postulantes')
        .select('vacante_origen');
      const uniqueOrigen = new Set<string>();
      (origenes ?? []).forEach(r => {
        const v = r.vacante_origen;
        if (v && !NOISE_PATTERNS.some(p => p.test(v))) uniqueOrigen.add(v);
      });
      setVacantesAbiertas((manuales?.length ?? 0) + uniqueOrigen.size);
    })();
  }, []);

  const accesos = [
    { id: 'dashboard', label: 'Operaciones', desc: 'Dashboard, Pipeline y Talentos', icon: Icons.briefcase, color: 'from-blue-500/20 to-blue-600/5' },
    { id: 'comercial-clientes', label: 'Comercial', desc: 'Clientes y pipeline comercial', icon: Icons.trending, color: 'from-emerald-500/20 to-emerald-600/5' },
    { id: 'fin-flujo-caja', label: 'Finanzas', desc: 'Estado de resultados y financiamiento', icon: Icons.dollar, color: 'from-amber-500/20 to-amber-600/5' },
    { id: 'legal-outsourcing', label: 'Legal', desc: 'Documentación de empresas Nodo', icon: Icons.shield, color: 'from-violet-500/20 to-violet-600/5' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="flex flex-col items-center text-center pt-6 pb-10">
        <img src={nodoLogo} alt="Nodo Conectando Talentos" className="h-24 w-24 rounded-2xl object-cover shadow-lg mb-5" />
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Nodo Conectando Talentos</h1>
        <p className="text-sm text-muted-foreground mt-2">Plataforma integral de gestión: Operaciones, Comercial, Finanzas y Legal.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <div className="bg-card border border-border rounded-2xl p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Trabajadores contratados</p>
          <p className="text-5xl font-bold text-foreground tabular-nums">{contratados ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-2">Total acumulado en pipeline.</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Vacantes abiertas</p>
          <p className="text-5xl font-bold text-foreground tabular-nums">{vacantesAbiertas ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-2">Procesos activos de reclutamiento.</p>
        </div>
      </div>

      {/* Accesos directos */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Accesos directos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accesos.map(a => (
            <button
              key={a.id}
              onClick={() => onNavigate(a.id)}
              className={`group text-left bg-gradient-to-br ${a.color} bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all`}
            >
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-foreground mb-3 shadow-sm">
                {a.icon}
              </div>
              <p className="text-sm font-semibold text-foreground">{a.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

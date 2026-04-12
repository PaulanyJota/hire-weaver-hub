import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatName } from '@/lib/utils';
import { getClienteForVacante } from '@/lib/clienteMapping';
import { useClientes } from '@/hooks/useClientes';
import { useVacantesReales } from '@/hooks/useVacantesReales';

interface Entrevista {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  profesion: string | null;
  vacante_origen: string | null;
  fecha_postulacion: string | null;
  estado_pipeline: string | null;
  mensaje_postulante: string | null;
}

export const EntrevistasView: React.FC = () => {
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [loading, setLoading] = useState(true);
  const { clientes } = useClientes();
  const { vacantes } = useVacantesReales();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('postulantes')
        .select('id, nombre, email, telefono, profesion, vacante_origen, fecha_postulacion, estado_pipeline, mensaje_postulante')
        .eq('estado_pipeline', 'Entrevista Agendada')
        .order('fecha_postulacion', { ascending: false });
      setEntrevistas(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const resolveCliente = (vacanteOrigen: string | null): string => {
    if (!vacanteOrigen) return '—';
    const match = vacantes.find(v => v.cargo.toLowerCase() === vacanteOrigen.toLowerCase());
    if (match && match.clienteNombre) {
      return match.clienteNombre;
    }
    const mapped = getClienteForVacante(vacanteOrigen);
    return mapped !== 'Sin cliente' ? mapped : '—';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrevistas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Postulantes con entrevista agendada ({entrevistas.length})
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entrevistas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-4xl mb-3">📅</p>
          <h3 className="text-lg font-semibold text-foreground">Sin entrevistas agendadas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Los postulantes aparecerán aquí cuando su estado sea "Entrevista Agendada".
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cargo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Profesión</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fecha Postulación</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Último Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {entrevistas.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{formatName(e.nombre)}</td>
                    <td className="px-4 py-3 text-foreground">{e.vacante_origen || '—'}</td>
                    <td className="px-4 py-3 text-foreground">{resolveCliente(e.vacante_origen)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.profesion || '—'}</td>
                    <td className="px-4 py-3">
                      {e.telefono ? (
                        <a href={`https://wa.me/${e.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {e.telefono}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.fecha_postulacion ? new Date(e.fecha_postulacion).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[250px] truncate" title={e.mensaje_postulante || ''}>
                      {e.mensaje_postulante || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

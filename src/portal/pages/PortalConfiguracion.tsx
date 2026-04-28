import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  last_login_at: string | null;
}

export default function PortalConfiguracion() {
  const { company } = usePortalAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'empresa' | 'usuarios'>('empresa');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: u }, { data: c }] = await Promise.all([
        supabase.from('portal_user_profiles').select('id, full_name, role, active, last_login_at').order('full_name'),
        company ? supabase.from('portal_companies').select('*').eq('id', company.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setUsers((u ?? []) as any);
      setCompanyData(c);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [company]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configuración</h1>
      </header>

      <div className="flex gap-1 border-b border-border">
        {(['empresa', 'usuarios'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#1F4E78] text-[#1F4E78]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'empresa' ? 'Mi empresa' : 'Usuarios'}
          </button>
        ))}
      </div>

      {tab === 'empresa' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {loading ? <Skeleton className="h-40 w-full" /> : companyData ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Nombre" value={companyData.name} />
              <Field label="RUT" value={companyData.rut ?? '—'} />
              <Field label="Área BUK" value={companyData.buk_area_name} />
              <Field label="Color" value={companyData.primary_color} />
              <Field label="Estado" value={companyData.active ? 'Activa' : 'Inactiva'} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Vista global Nodo: sin empresa específica.</p>
          )}
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 flex justify-end border-b border-border">
            <button
              disabled
              onClick={() => toast({ title: 'Próximamente', description: 'La invitación de usuarios estará disponible pronto.' })}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#1F4E78] rounded-lg opacity-50"
            >Invitar usuario</button>
          </div>
          {loading ? <div className="p-4"><Skeleton className="h-32 w-full" /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Rol</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Último acceso</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 font-medium">{u.full_name}</td>
                    <td className="p-3 capitalize">{u.role.replace('_', ' ')}</td>
                    <td className="p-3">{u.active ? 'Activo' : 'Inactivo'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{u.last_login_at ? new Date(u.last_login_at).toLocaleString('es-CL') : 'Nunca'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, UserCog } from 'lucide-react';

interface UserRow {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  last_login_at: string | null;
}

export default function PortalConfiguracion() {
  const { company } = usePortalAuth();
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
      <header className="p-fade-up">
        <p className="p-section-title">Ajustes</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Configuración</h1>
      </header>

      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'empresa', label: 'Mi empresa', icon: Building2 },
          { key: 'usuarios', label: 'Usuarios', icon: UserCog },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-[hsl(213_78%_29%)] text-[hsl(213_78%_29%)]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'empresa' && (
        <div className="p-card p-6">
          {loading ? <Skeleton className="h-40 w-full" /> : companyData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" value={companyData.name} />
              <Field label="RUT" value={companyData.rut ?? '—'} mono />
              <Field label="Área BUK" value={companyData.buk_area_name} />
              <Field label="Color de marca" value={companyData.primary_color} swatch={companyData.primary_color} />
              <Field label="Estado" value={companyData.active ? 'Activa' : 'Inactiva'} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Vista global Nodo: sin empresa específica.</p>
          )}
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="p-card overflow-hidden">
          {loading ? <div className="p-4"><Skeleton className="h-32 w-full" /></div> : (
            <table className="p-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-semibold">{u.full_name}</td>
                    <td className="capitalize text-sm">{u.role.replace('_', ' ')}</td>
                    <td>
                      <span className={`p-pill ${u.active ? 'p-pill-success' : 'p-pill-muted'}`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">{u.last_login_at ? new Date(u.last_login_at).toLocaleString('es-CL') : 'Nunca'}</td>
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

function Field({ label, value, mono, swatch }: { label: string; value: string; mono?: boolean; swatch?: string }) {
  return (
    <div className="rounded-xl border border-border p-4 bg-white">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {swatch && <span className="w-4 h-4 rounded-md border border-border shrink-0" style={{ background: swatch }} />}
        <p className={`font-semibold ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</p>
      </div>
    </div>
  );
}

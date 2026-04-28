import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Building2 } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const { user, profile, loading } = usePortalAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && profile) navigate('/portal', { replace: true });
  }, [loading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: e1 } = await supabase.auth.signInWithPassword({ email, password });
      if (e1) throw e1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      console.error('[portal-login]', msg);
      setError('Email o contraseña incorrectos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1F4E78] text-white flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Portal Cliente</h1>
          <p className="text-sm text-muted-foreground mt-1">NODO Talentos</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.cl"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1F4E78]/20 focus:border-[#1F4E78] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Contraseña</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1F4E78]/20 focus:border-[#1F4E78] transition-all"
            />
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#1F4E78] rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
          >
            {busy ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Si necesitas acceso, contacta a tu administrador en NODO Talentos.
        </p>
      </div>
    </div>
  );
}

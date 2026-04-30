import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Sparkles, Shield, Zap, BarChart3 } from 'lucide-react';
import '../portal.css';

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
    <div className="portal-root min-h-screen grid lg:grid-cols-2 font-sans">
      {/* Hero */}
      <div className="hidden lg:flex relative overflow-hidden text-white p-12 flex-col justify-between"
        style={{ background: 'linear-gradient(135deg, hsl(215 32% 12%) 0%, hsl(213 78% 22%) 60%, hsl(199 89% 36%) 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, hsl(199 89% 60%), transparent)' }} />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, hsl(213 78% 50%), transparent)' }} />

        <div className="relative flex items-center gap-3">
          <div className="p-logo"><Sparkles className="w-5 h-5" /></div>
          <div>
            <p className="font-bold tracking-tight">NODO Talentos</p>
            <p className="text-xs text-white/65">Portal Cliente</p>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Tu equipo, <span className="bg-gradient-to-r from-sky-300 to-white bg-clip-text text-transparent">en tiempo real.</span>
          </h2>
          <p className="text-white/75 text-base leading-relaxed">
            Asistencia, ausencias, contratos e incidencias de tu personal externo unificados en un solo lugar.
          </p>
          <ul className="space-y-3 pt-2">
            {[
              { icon: BarChart3, t: 'Dashboard con KPIs en vivo' },
              { icon: Shield, t: 'Datos protegidos con RUT enmascarado' },
              { icon: Zap, t: 'Aprobaciones e incidencias en segundos' },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3 text-sm text-white/85">
                <span className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} NODO Talentos · Outsourcing & EST</p>
      </div>

      {/* Form */}
      <div className="portal-shell flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md p-fade-up">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <div className="p-logo"><Sparkles className="w-5 h-5" /></div>
            <div>
              <p className="font-bold tracking-tight">NODO Talentos</p>
              <p className="text-xs text-muted-foreground">Portal Cliente</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Inicia sesión para acceder a tu portal.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1.5">Email corporativo</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@empresa.cl"
                className="p-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1.5">Contraseña</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="p-input"
              />
            </div>

            {error && (
              <p className="text-xs text-[hsl(0_73%_40%)] bg-[hsl(0_73%_52%/0.08)] border border-[hsl(0_73%_52%/0.2)] p-2.5 rounded-lg">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="p-btn-primary w-full py-2.5 text-sm mt-2">
              {busy ? 'Ingresando...' : 'Iniciar sesión →'}
            </button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-8">
            ¿Necesitas acceso? Contacta a tu administrador en NODO Talentos.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      if (mode === 'signup') {
        const { error: e1 } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (e1) throw e1;
        setInfo('Cuenta creada. Iniciando sesión...');
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) throw e2;
      } else {
        const { error: e1 } = await supabase.auth.signInWithPassword({ email, password });
        if (e1) throw e1;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg.toLowerCase().includes('invalid login')) setError('Email o contraseña incorrectos.');
      else if (msg.toLowerCase().includes('user already registered')) setError('Esta cuenta ya existe. Inicia sesión.');
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">NODO Talentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signin' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@nodotalentos.cl"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
          {info && <p className="text-xs text-foreground bg-muted p-2 rounded">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
          >
            {busy ? 'Procesando...' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
            className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer"
          >
            {mode === 'signin' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Solo emails @nodotalentos.cl reciben acceso de administrador.
        </p>
      </div>
    </div>
  );
}

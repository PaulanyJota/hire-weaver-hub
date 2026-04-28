import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type PortalRole = 'client_user' | 'client_admin' | 'nodo_admin';

export interface PortalProfile {
  id: string;
  portal_company_id: string | null;
  role: PortalRole;
  full_name: string;
  phone: string | null;
  active: boolean;
}

export interface PortalCompany {
  id: string;
  name: string;
  primary_color: string;
  logo_url: string | null;
}

interface PortalAuthCtx {
  user: User | null;
  session: Session | null;
  profile: PortalProfile | null;
  company: PortalCompany | null;
  loading: boolean;
  isAdmin: boolean;
  isNodoAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PortalAuthCtx>({
  user: null, session: null, profile: null, company: null,
  loading: true, isAdmin: false, isNodoAdmin: false,
  signOut: async () => {}, refresh: async () => {},
});

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [company, setCompany] = useState<PortalCompany | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: prof } = await supabase
      .from('portal_user_profiles')
      .select('id, portal_company_id, role, full_name, phone, active')
      .eq('id', uid)
      .maybeSingle();
    if (!prof || !prof.active) {
      setProfile(null);
      setCompany(null);
      return;
    }
    setProfile(prof as PortalProfile);
    if (prof.portal_company_id) {
      const { data: comp } = await supabase
        .from('portal_companies')
        .select('id, name, primary_color, logo_url')
        .eq('id', prof.portal_company_id)
        .maybeSingle();
      setCompany((comp as PortalCompany) ?? null);
    } else {
      setCompany(null);
    }
    // fire-and-forget last_login_at
    supabase.from('portal_user_profiles').update({ last_login_at: new Date().toISOString() }).eq('id', uid).then(() => {});
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => { loadProfile(sess.user.id); }, 0);
      } else {
        setProfile(null);
        setCompany(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) await loadProfile(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const refresh = async () => { if (user) await loadProfile(user.id); };

  return (
    <Ctx.Provider value={{
      user, session, profile, company, loading,
      isAdmin: profile?.role === 'client_admin' || profile?.role === 'nodo_admin',
      isNodoAdmin: profile?.role === 'nodo_admin',
      signOut, refresh,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePortalAuth = () => useContext(Ctx);

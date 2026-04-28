import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { useToast } from '@/hooks/use-toast';

export function PortalProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading, isAdmin } = usePortalAuth();
  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && !profile) {
      toast({
        title: 'Sin acceso',
        description: 'No tienes acceso al portal cliente.',
        variant: 'destructive',
      });
    }
  }, [loading, user, profile, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando portal...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/portal/login" state={{ from: location }} replace />;
  if (!profile) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/portal" replace />;

  return <>{children}</>;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

import { PortalAuthProvider } from "@/portal/hooks/usePortalAuth";
import { PortalProtectedRoute } from "@/portal/components/PortalProtectedRoute";
import { PortalLayout } from "@/portal/components/PortalLayout";
import PortalLogin from "@/portal/pages/PortalLogin";
import PortalDashboard from "@/portal/pages/PortalDashboard";
import PortalTrabajadores from "@/portal/pages/PortalTrabajadores";
import PortalTrabajadorDetalle from "@/portal/pages/PortalTrabajadorDetalle";
import PortalAsistencia from "@/portal/pages/PortalAsistencia";
import PortalAprobaciones from "@/portal/pages/PortalAprobaciones";
import PortalIncidencias from "@/portal/pages/PortalIncidencias";
import PortalConfiguracion from "@/portal/pages/PortalConfiguracion";
import PortalSucursalDetalle from "@/portal/pages/PortalSucursalDetalle";
import PortalControlMarcaje from "@/portal/pages/PortalControlMarcaje";
import PortalAsistenciasHoy from "@/portal/pages/PortalAsistenciasHoy";
import PortalHorasSemana from "@/portal/pages/PortalHorasSemana";
import PortalContratos from "@/portal/pages/PortalContratos";
import PortalComisiones from "@/portal/pages/PortalComisiones";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ============ PORTAL CLIENTE (auth independiente) ============ */}
          <Route
            path="/portal/*"
            element={
              <PortalAuthProvider>
                <Routes>
                  <Route path="login" element={<PortalLogin />} />
                  <Route
                    element={
                      <PortalProtectedRoute>
                        <PortalLayout />
                      </PortalProtectedRoute>
                    }
                  >
                    <Route index element={<PortalDashboard />} />
                    <Route path="trabajadores" element={<PortalTrabajadores />} />
                    <Route path="trabajadores/:id" element={<PortalTrabajadorDetalle />} />
                    <Route path="asistencia" element={<PortalAsistencia />} />
                    <Route path="asistencias-hoy" element={<PortalAsistenciasHoy />} />
                    <Route path="horas-semana" element={<PortalHorasSemana />} />
                    <Route path="control-marcaje" element={<PortalControlMarcaje />} />
                    <Route path="contratos" element={<PortalContratos />} />
                    <Route path="comisiones" element={<PortalComisiones />} />
                    <Route path="sucursal/:cost_center" element={<PortalSucursalDetalle />} />
                    <Route
                      path="aprobaciones"
                      element={
                        <PortalProtectedRoute adminOnly>
                          <PortalAprobaciones />
                        </PortalProtectedRoute>
                      }
                    />
                    <Route path="incidencias" element={<PortalIncidencias />} />
                    <Route
                      path="configuracion"
                      element={
                        <PortalProtectedRoute adminOnly>
                          <PortalConfiguracion />
                        </PortalProtectedRoute>
                      }
                    />
                  </Route>
                </Routes>
              </PortalAuthProvider>
            }
          />

          {/* ============ APP INTERNA NODO (intacta) ============ */}
          <Route
            path="/*"
            element={
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/portal/login" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

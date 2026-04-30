import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import PortalAprobaciones from "@/portal/pages/PortalAprobaciones";
import PortalIncidencias from "@/portal/pages/PortalIncidencias";
import PortalConfiguracion from "@/portal/pages/PortalConfiguracion";

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
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
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

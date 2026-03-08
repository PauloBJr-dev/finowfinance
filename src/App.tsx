import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Transacoes = lazy(() => import("./pages/Transacoes"));
const ContasPagar = lazy(() => import("./pages/ContasPagar"));
const Metas = lazy(() => import("./pages/Metas"));
const Cofrinho = lazy(() => import("./pages/Cofrinho"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Chat = lazy(() => import("./pages/Chat"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Dashboard /> : <LandingPage />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/transacoes" element={<ProtectedRoute><Transacoes /></ProtectedRoute>} />
        <Route path="/contas-pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
        <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
        <Route path="/cofrinho" element={<ProtectedRoute><Cofrinho /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <PrivacyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
          </PrivacyProvider>
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

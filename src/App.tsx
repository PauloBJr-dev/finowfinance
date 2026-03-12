import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { UpdateBanner } from "@/components/shared/UpdateBanner";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Transacoes = lazy(() => import("./pages/Transacoes"));
const ContasPagar = lazy(() => import("./pages/ContasPagar"));
const Metas = lazy(() => import("./pages/Metas"));
const Cofrinho = lazy(() => import("./pages/Cofrinho"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Faturas = lazy(() => import("./pages/Faturas"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

/** Map route paths to their lazy import functions for prefetching */
export const routeImportMap: Record<string, () => Promise<unknown>> = {
  "/": () => import("./pages/Dashboard"),
  "/transacoes": () => import("./pages/Transacoes"),
  "/contas-pagar": () => import("./pages/ContasPagar"),
  "/faturas": () => import("./pages/Faturas"),
  "/metas": () => import("./pages/Metas"),
  "/cofrinho": () => import("./pages/Cofrinho"),
  "/configuracoes": () => import("./pages/Configuracoes"),
  "/relatorios": () => import("./pages/Relatorios"),
};
/** Prefetch all route chunks during browser idle time */
function RoutePrefetcher() {
  useEffect(() => {
    const prefetchAll = () => {
      Object.values(routeImportMap).forEach((importFn) => {
        importFn().catch(() => {});
      });
    };

    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(prefetchAll, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(prefetchAll, 2000);
      return () => clearTimeout(id);
    }
  }, []);

  return null;
}

const queryClient = new QueryClient();

/** Skeleton page loader — feels faster than a spinner */
const PageLoader = () => (
  <div className="flex min-h-screen bg-background">
    {/* Sidebar skeleton (desktop only) */}
    <div className="hidden md:flex w-64 flex-col gap-4 border-r border-border p-4">
      <Skeleton className="h-8 w-32" />
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    </div>
    {/* Content skeleton */}
    <div className="flex-1 p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
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
      <RoutePrefetcher />
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/transacoes" element={<ProtectedRoute><Transacoes /></ProtectedRoute>} />
        <Route path="/contas-pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
        <Route path="/faturas" element={<ProtectedRoute><Faturas /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
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
      <UpdateBanner />
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

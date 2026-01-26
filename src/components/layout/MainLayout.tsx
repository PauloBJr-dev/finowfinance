import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingActionButton } from "@/components/navigation/FloatingActionButton";
import { QuickAddModal } from "@/components/transactions/QuickAddModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { collapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          !isMobile && (collapsed ? "ml-16" : "ml-64"),
          isMobile && "pb-20"
        )}
      >
        <div className="container py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => setQuickAddOpen(true)} />

      {/* Quick Add Modal */}
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}

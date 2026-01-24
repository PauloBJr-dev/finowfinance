import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingActionButton } from "@/components/navigation/FloatingActionButton";
import { QuickAddModal } from "@/components/transactions/QuickAddModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          !isMobile && "ml-64",
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

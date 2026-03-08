import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingActionButton } from "@/components/navigation/FloatingActionButton";
import { QuickAddModal } from "@/components/transactions/QuickAddModal";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/contexts/SidebarContext";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { collapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <Sidebar />}

      <main
        className={cn(
          "relative min-h-screen transition-all duration-300",
          !isMobile && (collapsed ? "ml-16" : "ml-64"),
          isMobile && "pb-24"
        )}
      >


        <div className="container px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      {isMobile && <BottomNav />}
      <FloatingActionButton onClick={() => setQuickAddOpen(true)} />
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingActionButton } from "@/components/navigation/FloatingActionButton";
import { QuickAddModal } from "@/components/transactions/QuickAddModal";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { RightSidebarTrigger } from "@/components/layout/RightSidebarTrigger";
import { RightSidebarDrawer } from "@/components/layout/RightSidebarDrawer";
import { useBreakpoint } from "@/hooks/use-mobile";
import { useRightSidebar } from "@/hooks/use-right-sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const rightSidebar = useRightSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Desktop Right Sidebar (fixed) */}
      {isDesktop && <RightSidebar />}

      {/* Tablet/Mobile Right Sidebar Trigger */}
      {!isDesktop && (
        <RightSidebarTrigger onClick={rightSidebar.toggle} />
      )}

      {/* Right Sidebar Drawer (Tablet/Mobile) */}
      <RightSidebarDrawer 
        open={rightSidebar.isOpen} 
        onOpenChange={rightSidebar.setIsOpen} 
      />

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          // Desktop: left sidebar (240px) + right sidebar (320px)
          isDesktop && "ml-60 mr-80",
          // Tablet: left sidebar collapsed (64px)
          isTablet && "ml-16",
          // Mobile: no sidebars, bottom padding for nav
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

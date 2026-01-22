import { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingActionButton } from "@/components/navigation/FloatingActionButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  const handleQuickAdd = () => {
    // TODO: Implement quick add modal
    console.log("Quick Add clicked");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          // Desktop: offset for sidebar
          !isMobile && "ml-64",
          // Mobile: add padding for bottom nav
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
      <FloatingActionButton onClick={handleQuickAdd} />
    </div>
  );
}

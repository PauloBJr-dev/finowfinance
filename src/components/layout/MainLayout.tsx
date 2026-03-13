import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingActionButton } from "@/components/navigation/FloatingActionButton";
import { QuickAddModal } from "@/components/transactions/QuickAddModal";
import { MentorFAB } from "@/components/chat/MentorFAB";
import { MentorChatSheet } from "@/components/chat/MentorChatSheet";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/contexts/SidebarContext";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
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
        <div className="container px-4 sm:px-6 py-6 animate-fade-in">
          {children}
        </div>
      </main>

      {isMobile && <BottomNav />}

      {/* FAB Stack */}
      <div
        className={cn(
          "fixed z-50 flex flex-col items-center gap-3 transition-all duration-300",
          "bottom-8 right-8",
          "max-md:bottom-[4.5rem] max-md:right-4"
        )}
      >
        {/* Mentor FAB — slides up when QuickAdd is hidden */}
        <MentorFAB onClick={() => setMentorOpen(true)} />

        {/* QuickAdd FAB — hidden when mentor sheet is open */}
        {!mentorOpen && (
          <FloatingActionButton onClick={() => setQuickAddOpen(true)} />
        )}
      </div>

      <MentorChatSheet open={mentorOpen} onOpenChange={setMentorOpen} />
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

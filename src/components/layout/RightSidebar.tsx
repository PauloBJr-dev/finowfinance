import { ClockWidget } from "./ClockWidget";
import { NotificationsPanel } from "./NotificationsPanel";
import { MentorChat } from "./MentorChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  className?: string;
}

export function RightSidebar({ className }: RightSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed right-0 top-0 z-40 flex h-screen w-80 flex-col border-l border-border bg-card",
        className
      )}
    >
      <ScrollArea className="flex-1">
        {/* Clock Widget */}
        <ClockWidget className="rounded-none border-b border-border" />

        {/* Notifications */}
        <NotificationsPanel />

        {/* Mentor Chat */}
        <MentorChat />
      </ScrollArea>
    </aside>
  );
}

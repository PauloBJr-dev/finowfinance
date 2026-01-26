import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ClockWidget } from "./ClockWidget";
import { NotificationsPanel } from "./NotificationsPanel";
import { MentorChat } from "./MentorChat";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RightSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RightSidebarDrawer({ open, onOpenChange }: RightSidebarDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Painel de Notificações e Chat</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full">
          {/* Clock Widget */}
          <ClockWidget className="rounded-none border-b border-border" />

          {/* Notifications */}
          <NotificationsPanel />

          {/* Mentor Chat */}
          <MentorChat />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { navigationItems, settingsItem, reportsItem } from "./navigation-items";
import { MoreHorizontal } from "lucide-react";
import { routeImportMap } from "@/App";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const mobileLabels: Record<string, string> = {
  "Contas a pagar": "Contas",
  "Configurações": "Config",
};

const visibleItems = navigationItems.slice(0, 4);
const overflowNavItems = [...navigationItems.slice(4), reportsItem, settingsItem];

export function BottomNav() {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isOverflowActive = overflowNavItems.some(item => item.to === location.pathname);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl shadow-[0_-2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_16px_rgba(0,0,0,0.2)] pb-safe md:hidden">
        <div className="flex h-16 items-center justify-around px-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            const label = mobileLabels[item.label] || item.label;

            const prefetch = () => {
              const fn = routeImportMap[item.to];
              if (fn) fn().catch(() => {});
            };

            return (
              <Link
                key={item.to}
                to={item.to}
                onTouchStart={prefetch}
                className="flex flex-1 flex-col items-center justify-center py-1"
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 transition-all duration-300",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground active:scale-95"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                </div>
              </Link>
            );
          })}

          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-1"
          >
            <div
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 transition-all duration-300",
                isOverflowActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <MoreHorizontal
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isOverflowActive && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium leading-tight">Mais</span>
            </div>
          </button>
        </div>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm font-semibold text-muted-foreground">Mais opções</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3">
            {overflowNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground bg-muted/40 active:bg-muted/70"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

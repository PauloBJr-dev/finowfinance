import { useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { navigationItems, settingsItem, reportsItem } from "./navigation-items";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routeImportMap } from "@/App";

// Mobile-friendly short labels
const mobileLabels: Record<string, string> = {
  "Contas a pagar": "Contas",
  "Configurações": "Config",
};

const visibleItems = navigationItems.slice(0, 4);
const overflowNavItems = [...navigationItems.slice(4), reportsItem, settingsItem];

export function BottomNav() {
  const location = useLocation();
  const isOverflowActive = overflowNavItems.some(item => item.to === location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-safe md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
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
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                isOverflowActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="font-medium">Mais</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
            {overflowNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <DropdownMenuItem key={item.to} asChild>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3",
                      isActive && "text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

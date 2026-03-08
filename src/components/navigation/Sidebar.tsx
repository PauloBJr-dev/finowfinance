import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { primaryItems, secondaryItems, reportsItem, settingsItem } from "./navigation-items";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { ExportReportModal } from "@/components/reports/ExportReportModal";
import logoLight from "@/assets/finow-logo-light@2x.png";
import logoDark from "@/assets/finow-logo-dark@2x.png";
import iconImg from "@/assets/finow-icon-96.png";

export function Sidebar() {
  const { collapsed, toggle } = useSidebarContext();
  const { signOut, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [reportOpen, setReportOpen] = useState(false);

  const logo = resolvedTheme === "dark" ? logoDark : logoLight;
  const ReportsIcon = reportsItem.icon;

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header: Logo + Collapse toggle */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-3">
          {collapsed ? (
            <>
              <img src={iconImg} alt="Finow" className="h-8 w-8 rounded-lg" />
              <button
                onClick={toggle}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <img src={logo} alt="Finow" className="h-8 w-auto" />
              <button
                onClick={toggle}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Primary navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {primaryItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
              />
            ))}
          </div>

          <Separator className="my-3 bg-sidebar-border" />

          {/* Secondary navigation */}
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        {/* Footer: Reports, Settings, Logout */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {/* Reports button (opens modal) */}
          <button
            onClick={() => setReportOpen(true)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <ReportsIcon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{reportsItem.label}</span>}
          </button>

          <NavItem
            to={settingsItem.to}
            icon={settingsItem.icon}
            label={settingsItem.label}
            collapsed={collapsed}
          />

          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
                collapsed && "justify-center px-2"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </Button>
          )}
        </div>
      </aside>

      <ExportReportModal open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}

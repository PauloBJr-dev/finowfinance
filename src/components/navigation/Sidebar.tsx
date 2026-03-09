import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { primaryItems, secondaryItems, reportsItem, settingsItem } from "./navigation-items";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebarContext } from "@/contexts/SidebarContext";
import logoLight from "@/assets/finow-logo-light@2x.png";
import logoDark from "@/assets/finow-logo-dark@2x.png";
import iconImg from "@/assets/finow-icon-96.png";

export function Sidebar() {
  const { collapsed, toggle } = useSidebarContext();
  const { signOut, user } = useAuth();
  const { resolvedTheme } = useTheme();

  const logo = resolvedTheme === "dark" ? logoDark : logoLight;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar/80 backdrop-blur-xl border-r border-white/10 dark:border-white/5 shadow-[4px_0_16px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.2)] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header: Logo + Collapse toggle */}
      <div className="relative flex h-16 items-center justify-center border-b border-sidebar-border/50 px-3">
        {collapsed ? (
          <img src={iconImg} alt="Finow" className="h-8 w-8 rounded-lg" />
        ) : (
          <img src={logo} alt="Finow" className="h-8 w-auto" />
        )}
        <button
          onClick={toggle}
          className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-white/10 dark:hover:bg-white/5"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
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
              premium={"premium" in item ? item.premium : false}
            />
          ))}
        </div>
      </nav>

      {/* Footer: Reports, Settings, Logout */}
      <div className="border-t border-sidebar-border/50 p-3 space-y-1">
        <NavItem
          to={reportsItem.to}
          icon={reportsItem.icon}
          label={reportsItem.label}
          collapsed={collapsed}
          premium={reportsItem.premium}
        />

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
  );
}

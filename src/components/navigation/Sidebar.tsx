import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { navigationItems, settingsItem } from "./navigation-items";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
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
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <img src={logo} alt="Finow" className="h-8 w-auto" />
        )}
        {collapsed && (
          <img src={iconImg} alt="Finow" className="mx-auto h-8 w-8 rounded-lg" />
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigationItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
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
              "mt-2 w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
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

import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
  premium?: boolean;
}

export function NavItem({ to, icon: Icon, label, collapsed = false, premium = false }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;
  const { plan } = useAuth();

  const showLock = premium && plan === "free";

  return (
    <RouterNavLink
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
      {!collapsed && (
        <span className="flex items-center gap-1.5">
          {label}
          {showLock && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
      )}
    </RouterNavLink>
  );
}

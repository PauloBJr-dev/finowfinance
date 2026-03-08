import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Target,
  PiggyBank,
  Settings,
  MessageCircle,
  FileBarChart,
} from "lucide-react";

/** Primary navigation group */
export const primaryItems = [
  {
    to: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    to: "/transacoes",
    icon: ArrowLeftRight,
    label: "Transações",
  },
  {
    to: "/contas-pagar",
    icon: FileText,
    label: "Contas a pagar",
  },
] as const;

/** Secondary navigation group */
export const secondaryItems = [
  {
    to: "/metas",
    icon: Target,
    label: "Metas",
  },
  {
    to: "/cofrinho",
    icon: PiggyBank,
    label: "Cofrinho",
  },
  {
    to: "/chat",
    icon: MessageCircle,
    label: "Mentor IA",
  },
] as const;

/** Reports item (opens modal, not a route) */
export const reportsItem = {
  icon: FileBarChart,
  label: "Relatórios",
};

export const settingsItem = {
  to: "/configuracoes",
  icon: Settings,
  label: "Configurações",
};

/** All navigable items (for BottomNav) */
export const navigationItems = [...primaryItems, ...secondaryItems] as const;

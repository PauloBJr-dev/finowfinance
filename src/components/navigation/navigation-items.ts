import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Receipt,
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
  {
    to: "/faturas",
    icon: Receipt,
    label: "Faturas",
  },
] as const;

/** Secondary navigation group */
export const secondaryItems = [
  {
    to: "/metas",
    icon: Target,
    label: "Metas",
    premium: true,
  },
  {
    to: "/cofrinho",
    icon: PiggyBank,
    label: "Cofrinho",
    premium: true,
  },
  {
    to: "/chat",
    icon: MessageCircle,
    label: "Mentor IA",
    premium: true,
  },
] as const;

/** Reports item (navigable route) */
export const reportsItem = {
  to: "/relatorios",
  icon: FileBarChart,
  label: "Relatórios",
  premium: true,
};

export const settingsItem = {
  to: "/configuracoes",
  icon: Settings,
  label: "Configurações",
};

/** All navigable items (for BottomNav) */
export const navigationItems = [...primaryItems, ...secondaryItems] as const;

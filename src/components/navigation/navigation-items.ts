import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  CreditCard,
  Target,
  PiggyBank,
  Settings,
} from "lucide-react";

export const navigationItems = [
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
    icon: CreditCard,
    label: "Faturas",
  },
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
] as const;

export const settingsItem = {
  to: "/configuracoes",
  icon: Settings,
  label: "Configurações",
};

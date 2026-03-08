import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Target,
  PiggyBank,
  Settings,
  MessageCircle,
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

export const settingsItem = {
  to: "/configuracoes",
  icon: Settings,
  label: "Configurações",
};

import {
  ShoppingBag,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Heart,
  HeartPulse,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Smartphone,
  Dumbbell,
  Music,
  TrendingUp,
  Building,
  Users,
  Tag,
  Gamepad2,
  MoreHorizontal,
  Coffee,
  Shirt,
  Wifi,
  Zap,
  Droplet,
  PiggyBank,
  Wrench,
  Laptop,
  PlusCircle,
  CreditCard,
  Wallet,
  HelpCircle,
  Banknote,
  ArrowRightLeft,
  FileText,
  Ticket,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapa completo de ícones Lucide para categorias.
 * Suporta kebab-case (DB) e PascalCase (fallback).
 */
export const categoryIconMap: Record<string, LucideIcon> = {
  // kebab-case (valores do banco de dados)
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  utensils: Utensils,
  heart: Heart,
  "heart-pulse": HeartPulse,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  plane: Plane,
  gift: Gift,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  music: Music,
  "trending-up": TrendingUp,
  building: Building,
  users: Users,
  tag: Tag,
  "gamepad-2": Gamepad2,
  gamepad: Gamepad2,
  "more-horizontal": MoreHorizontal,
  coffee: Coffee,
  shirt: Shirt,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  "piggy-bank": PiggyBank,
  wrench: Wrench,
  laptop: Laptop,
  "plus-circle": PlusCircle,
  "credit-card": CreditCard,
  wallet: Wallet,
  "help-circle": HelpCircle,
  banknote: Banknote,
  "arrow-right-left": ArrowRightLeft,
  "file-text": FileText,
  ticket: Ticket,
  // PascalCase fallbacks
  ShoppingBag,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Heart,
  HeartPulse,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Smartphone,
  Dumbbell,
  Music,
  TrendingUp,
  Building,
  Users,
  Tag,
  Gamepad2,
  Wrench,
  Laptop,
  PlusCircle,
  CreditCard,
  Wallet,
  HelpCircle,
  Banknote,
  Coffee,
  Shirt,
  Wifi,
  Zap,
  Droplet,
  PiggyBank,
};

/** Fallback icon when category icon is not found */
export const DEFAULT_CATEGORY_ICON = Tag;

/**
 * Resolve um nome de ícone (kebab-case ou PascalCase) para um componente Lucide.
 */
export function resolveCategoryIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return DEFAULT_CATEGORY_ICON;
  return categoryIconMap[iconName] || DEFAULT_CATEGORY_ICON;
}

/**
 * Payment method icon map
 */
export const paymentMethodIcons: Record<string, LucideIcon> = {
  cash: Banknote,
  debit: Wallet,
  credit_card: CreditCard,
  pix: Smartphone,
  transfer: ArrowRightLeft,
  boleto: FileText,
  voucher: Ticket,
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit_card: "Crédito",
  pix: "Pix",
  transfer: "Pix/TED",
  boleto: "Boleto",
  voucher: "Voucher",
};

export function resolvePaymentMethodIcon(method: string): LucideIcon {
  return paymentMethodIcons[method] || HelpCircle;
}

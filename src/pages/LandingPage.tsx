import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  CreditCard,
  Lock,
  Menu,
  PiggyBank,
  Target,
  X,
  FileText,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
  Shield,
  Mail,
} from "lucide-react";
import finowLogoDark from "@/assets/finow-logo-dark@2x.png";
import finowLogoLight from "@/assets/finow-logo-light@2x.png";

/* ─── Animated section wrapper ─── */
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#recursos", label: "Recursos" },
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#depoimentos", label: "Depoimentos" },
    { href: "#precos", label: "Preços" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
        <img
          src={finowLogoDark}
          alt="Finow"
          className="h-7"
        />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")}>
            Começar grátis
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-4 pb-4 animate-fade-in">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <div className="flex gap-3 mt-3">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" className="flex-1" onClick={() => navigate("/auth")}>
              Começar grátis
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium">
            Gratuito • Sem cartão de crédito
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Pare de sobreviver no mês.{" "}
            <span className="text-primary">Comece a dominar seu dinheiro.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8">
            Um app de finanças pessoais com mentor IA que te ajuda a entender
            pra onde vai cada real — sem complicação, sem julgamento.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-8" onClick={() => navigate("/auth")}>
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#recursos">Ver recursos</a>
            </Button>
          </div>
        </div>

        {/* Glassmorphism mockup card */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "hsl(var(--glass-bg))",
              border: "1px solid hsl(var(--glass-border))",
              boxShadow: "var(--glass-shadow)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Saldo total</p>
                <p className="text-3xl font-bold text-foreground">R$ 4.230,00</p>
              </div>
              <Badge className="bg-success text-success-foreground">+12% este mês</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Receitas", value: "R$ 5.800", color: "text-success" },
                { label: "Despesas", value: "R$ 3.120", color: "text-destructive" },
                { label: "Economia", value: "R$ 2.680", color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
const features = [
  {
    icon: BarChart3,
    title: "Controle total",
    desc: "Registre receitas e despesas manualmente, do seu jeito. Sem conectar banco, sem surpresas.",
  },
  {
    icon: CreditCard,
    title: "Faturas no radar",
    desc: "Cadastre seus cartões e acompanhe faturas abertas, fechadas e pagas em um só lugar.",
  },
  {
    icon: Brain,
    title: "Mentor IA",
    desc: "Um assistente financeiro que sugere categorias, gera insights e conversa com você sobre suas finanças.",
  },
  {
    icon: Target,
    title: "Metas inteligentes",
    desc: "Defina objetivos financeiros e acompanhe o progresso com visualizações claras.",
  },
  {
    icon: FileText,
    title: "Relatórios PDF",
    desc: "Exporte relatórios detalhados das suas finanças para guardar ou compartilhar.",
  },
  {
    icon: Lock,
    title: "Segurança máxima",
    desc: "Dados criptografados, sem compartilhamento com terceiros. Você no controle total.",
  },
];

function FeaturesSection() {
  return (
    <section id="recursos" className="py-20 lg:py-28 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa, nada que você não precisa
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Ferramentas pensadas para quem quer clareza financeira sem complicação.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 100}>
              <Card className="h-full border-border/60 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ─── */
const steps = [
  {
    num: "01",
    title: "Cadastre-se em 30 segundos",
    desc: "Crie sua conta grátis com nome, e-mail e senha. Sem burocracia.",
  },
  {
    num: "02",
    title: "Registre suas transações",
    desc: "Adicione receitas e despesas com poucos toques. A IA sugere a categoria pra você.",
  },
  {
    num: "03",
    title: "Veja sua vida financeira com clareza",
    desc: "Dashboard atualizado em tempo real, insights do mentor IA e relatórios prontos.",
  },
];

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simples assim
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Três passos para transformar sua relação com o dinheiro.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <AnimatedSection key={s.num} delay={i * 200} className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold mb-4">
                {s.num}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── App Preview / Screenshots ─── */
function AppPreviewSection() {
  const previews = [
    {
      title: "Dashboard",
      desc: "Visão completa das suas finanças em tempo real.",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Saldo total</p>
              <p className="text-lg font-bold text-foreground">R$ 4.230,00</p>
            </div>
            <Badge className="bg-success/15 text-success border-0 text-[10px]">+12%</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Receitas", value: "R$ 5.800", c: "text-success" },
              { label: "Despesas", value: "R$ 3.120", c: "text-destructive" },
              { label: "Economia", value: "R$ 2.680", c: "text-primary" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg bg-secondary/50 p-2 text-center">
                <p className="text-[9px] text-muted-foreground">{k.label}</p>
                <p className={`text-xs font-semibold ${k.c}`}>{k.value}</p>
              </div>
            ))}
          </div>
          {/* Mini chart bars */}
          <div className="flex items-end gap-1.5 h-16 pt-2">
            {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 50, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/20"
                style={{ height: `${h}%` }}
              >
                <div
                  className="w-full rounded-sm bg-primary"
                  style={{ height: `${Math.min(h + 10, 100) * 0.6}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Transações",
      desc: "Registre e acompanhe cada movimentação.",
      content: (
        <div className="space-y-2">
          {[
            { cat: "Mercado", amount: "R$ 245,90", color: "hsl(142, 60%, 40%)", icon: "🛒", type: "expense" },
            { cat: "Salário", amount: "R$ 5.800,00", color: "hsl(210, 60%, 50%)", icon: "💼", type: "income" },
            { cat: "Transporte", amount: "R$ 89,00", color: "hsl(35, 80%, 50%)", icon: "🚌", type: "expense" },
            { cat: "Restaurante", amount: "R$ 62,50", color: "hsl(0, 60%, 50%)", icon: "🍽️", type: "expense" },
            { cat: "Freelance", amount: "R$ 1.200,00", color: "hsl(260, 50%, 55%)", icon: "💻", type: "income" },
          ].map((t) => (
            <div key={t.cat} className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                style={{ backgroundColor: `${t.color}20` }}
              >
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{t.cat}</p>
                <p className="text-[9px] text-muted-foreground">Hoje</p>
              </div>
              <p className={`text-xs font-semibold tabular-nums ${t.type === "expense" ? "text-destructive" : "text-success"}`}>
                {t.type === "expense" ? "-" : "+"}{t.amount}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Faturas",
      desc: "Controle faturas de cartão com clareza.",
      content: (
        <div className="space-y-3">
          {[
            { card: "Nubank", status: "Aberta", amount: "R$ 1.430,00", color: "bg-primary", due: "Vence 15/04" },
            { card: "Inter", status: "Fechada", amount: "R$ 890,50", color: "bg-accent", due: "Vence 10/04" },
            { card: "C6 Bank", status: "Paga", amount: "R$ 2.100,00", color: "bg-success", due: "Paga 05/03" },
          ].map((inv) => (
            <div key={inv.card} className="rounded-lg border border-border/40 bg-secondary/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${inv.color}`} />
                  <p className="text-xs font-medium text-foreground">{inv.card}</p>
                </div>
                <Badge variant="secondary" className="text-[9px] h-5">{inv.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{inv.amount}</p>
                <p className="text-[10px] text-muted-foreground">{inv.due}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja o Finow em ação
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Uma prévia de como você vai visualizar suas finanças.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {previews.map((p, i) => (
            <AnimatedSection key={p.title} delay={i * 150}>
              <div
                className="rounded-2xl p-5 h-full"
                style={{
                  background: "hsl(var(--glass-bg))",
                  border: "1px solid hsl(var(--glass-border))",
                  boxShadow: "var(--glass-shadow)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
              >
                {/* Fake window bar */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <span className="ml-2 text-[10px] text-muted-foreground font-medium">{p.title}</span>
                </div>
                {p.content}
                <p className="text-[10px] text-muted-foreground mt-3 text-center">{p.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
const testimonials = [
  {
    name: "Mariana Costa",
    info: "25 anos, Designer",
    text: "Eu achava que controlar finanças era coisa de gente chata. O Finow me mostrou que pode ser simples e até prazeroso. O mentor IA é incrível!",
    stars: 5,
  },
  {
    name: "Lucas Ferreira",
    info: "23 anos, Dev Júnior",
    text: "Tentei vários apps de finanças e desistia em uma semana. Com o Finow, já são 4 meses registrando tudo. A interface é perfeita.",
    stars: 5,
  },
  {
    name: "Ana Paula Ribeiro",
    info: "27 anos, Analista de RH",
    text: "Finalmente consigo ver pra onde meu dinheiro vai. O relatório em PDF me ajudou a convencer meu marido a cortar gastos desnecessários.",
    stars: 5,
  },
];

function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  return (
    <section id="depoimentos" className="py-20 lg:py-28 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quem usa, recomenda
          </h2>
        </AnimatedSection>

        <AnimatedSection className="max-w-xl mx-auto">
          <Card className="border-border/60 relative">
            <CardContent className="pt-8 pb-6 px-8 text-center">
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: testimonials[current].stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground leading-relaxed mb-6 italic">
                "{testimonials[current].text}"
              </p>
              <p className="font-semibold text-foreground">{testimonials[current].name}</p>
              <p className="text-sm text-muted-foreground">{testimonials[current].info}</p>

              <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={prev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === current ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={next}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── Stripe Price IDs ─── */
const STRIPE_PRICES = {
  premium_monthly: "price_1T8cWiFrEMxcLeDlJRUZdjqa",
  premium_yearly: "price_1T8cYbFrEMxcLeDlTElsmcv9",
  lifetime: "price_1T8cZOFrEMxcLeDl2RWbzFZl",
};

/* ─── Pricing ─── */
function PricingSection() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleCheckout = async (priceId: string, planName: string) => {
    setLoadingPlan(planName);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const premiumPrice = billingCycle === "monthly"
    ? { display: "R$ 6,90", period: "/mês", sub: null }
    : { display: "R$ 5,83", period: "/mês", sub: "R$ 70 cobrados anualmente — economize 15%" };

  const premiumPriceId = billingCycle === "monthly"
    ? STRIPE_PRICES.premium_monthly
    : STRIPE_PRICES.premium_yearly;

  const plans = [
    {
      name: "Grátis",
      price: "R$ 0",
      period: "para sempre",
      badge: null,
      desc: "Comece agora sem gastar nada.",
      subPrice: null as string | null,
      features: [
        "Transações ilimitadas",
        "2 contas bancárias",
        "Categorias personalizadas",
        "Sem prazo de validade",
      ],
      cta: "Começar grátis",
      highlight: false,
      action: () => navigate("/auth"),
    },
    {
      name: "Premium",
      price: premiumPrice.display,
      period: premiumPrice.period,
      badge: "Mais popular",
      desc: "Por menos de R$ 0,23/dia, tenha um mentor financeiro 24h.",
      subPrice: premiumPrice.sub,
      features: [
        "Tudo do plano Grátis",
        "Mentor IA ilimitado",
        "Relatórios em PDF",
        "Metas financeiras",
        "Contas ilimitadas",
        "Dashboard personalizável",
        "Temas e aparência customizável",
        "Suporte prioritário",
      ],
      cta: "Assinar Premium",
      highlight: true,
      action: () => handleCheckout(premiumPriceId, "Premium"),
    },
    {
      name: "Vitalício",
      price: "R$ 160",
      period: "pagamento único",
      badge: "Melhor custo-benefício",
      desc: "Pague uma vez. Use para sempre. Atualizações inclusas.",
      subPrice: "Equivale a menos de 2 anos de Premium — acesso eterno.",
      features: [
        "Tudo do plano Premium",
        "Acesso vitalício",
        "Atualizações de funcionalidade inclusas",
        "Sem renovação automática",
      ],
      cta: "Garantir acesso vitalício",
      highlight: false,
      action: () => handleCheckout(STRIPE_PRICES.lifetime, "Vitalício"),
    },
  ];

  return (
    <section id="precos" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Escolha o plano ideal pra você
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Comece de graça. Evolua quando quiser.
          </p>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span className="ml-1.5 text-[10px] font-bold opacity-80">-15%</span>
            </button>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => (
            <AnimatedSection key={plan.name} delay={i * 100}>
              <Card
                className={`relative h-full ${
                  plan.highlight
                    ? "border-primary shadow-lg ring-1 ring-primary/20"
                    : "border-border/60"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className={
                        plan.highlight
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pt-8 text-center">
                  <CardTitle className="text-xl mb-1">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.desc}</p>
                  {plan.subPrice && (
                    <p className="text-xs text-muted-foreground mt-1">{plan.subPrice}</p>
                  )}
                </CardHeader>
                <CardContent className="pb-8">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={plan.action}
                    disabled={loadingPlan === plan.name}
                  >
                    {loadingPlan === plan.name ? "Redirecionando..." : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {/* Bloco conformidade CDC/PROCON */}
        <AnimatedSection className="max-w-3xl mx-auto mt-12">
          <div className="rounded-xl border border-border/60 bg-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Transparência e seus direitos</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <p className="font-medium text-foreground mb-1">Cancelamento</p>
                <p>
                  Cancele sua assinatura a qualquer momento, sem multa. O acesso permanece ativo até
                  o fim do período já pago.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Reembolso</p>
                <p>
                  Garantia de 7 dias. Se não gostar, devolvemos 100% do valor — sem perguntas.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Renovação automática</p>
                <p>
                  Planos mensal e anual renovam automaticamente. Você será notificado antes de cada
                  cobrança.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Plano Vitalício</p>
                <p>
                  Pagamento único, sem renovação. Inclui todas as atualizações futuras de
                  funcionalidade. Não inclui eventuais produtos ou serviços independentes lançados
                  separadamente.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Dados pessoais</p>
                <p>
                  Seus dados financeiros são criptografados e nunca compartilhados com terceiros.
                  Você pode solicitar exclusão a qualquer momento.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Contato</p>
                <p className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  suporte@finow.com.br
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
const faqs = [
  {
    q: "Preciso conectar minha conta bancária?",
    a: "Não! O Finow funciona 100% com lançamentos manuais. Você digita suas receitas e despesas — sem compartilhar dados bancários com ninguém.",
  },
  {
    q: "É realmente grátis?",
    a: "Sim. O plano gratuito é completo: transações ilimitadas, 2 contas e categorias personalizadas. Sem prazo de validade, sem truques.",
  },
  {
    q: "Posso cancelar minha assinatura?",
    a: "Sim, a qualquer momento e sem multa. Você continua com acesso até o fim do período já pago. Oferecemos garantia de reembolso integral de 7 dias para novos assinantes.",
  },
  {
    q: "O que inclui o plano Vitalício?",
    a: "Pagamento único de R$ 160 com acesso eterno a todas as funcionalidades Premium, incluindo atualizações futuras. Não inclui eventuais produtos ou serviços independentes lançados separadamente.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Totalmente. Usamos criptografia de ponta a ponta, seus dados nunca são compartilhados com terceiros e você pode solicitar a exclusão completa a qualquer momento.",
  },
  {
    q: "O mentor IA dá conselhos de investimento?",
    a: "Não. O mentor IA te ajuda a entender seus hábitos financeiros, categorizar gastos e gerar insights — mas nunca dá recomendações de investimento, crédito ou seguros. Para isso, procure um profissional licenciado.",
  },
];

function FAQSection() {
  return (
    <section id="faq" className="py-20 lg:py-28 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perguntas frequentes
          </h2>
        </AnimatedSection>

        <AnimatedSection className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border/60 rounded-lg px-4 bg-card"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <img
              src={finowLogoDark}
              alt="Finow"
              className="h-6"
            />
            <p className="text-xs text-muted-foreground">
              Feito com 💚 no Brasil
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#precos" className="hover:text-foreground transition-colors">
              Preços
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Finow. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <AppPreviewSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
}

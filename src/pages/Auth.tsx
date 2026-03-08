import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import logoLight from "@/assets/finow-logo-light@2x.png";
import logoDark from "@/assets/finow-logo-dark@2x.png";

type Mode = "login" | "register";

const passwordRules = [
  { key: "length", label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "1 letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "1 letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "1 número", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "1 caractere especial (!@#$%...)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const { signIn, signUp } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const logo = resolvedTheme === "dark" ? logoDark : logoLight;

  const passed = useMemo(() => passwordRules.map((r) => r.test(form.password)), [form.password]);
  const allPassed = passed.every(Boolean);
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const canSubmitRegister = form.name.trim().length >= 2 && form.email.trim().length > 0 && allPassed && passwordsMatch;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || form.password.length < 6) {
      toast.error("Preencha email e senha corretamente");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
      } else {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitRegister) return;
    setLoading(true);
    try {
      const { error } = await signUp(form.email.trim(), form.password, form.name.trim(), form.phone.trim() || undefined);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
        setMode("login");
        setForm((prev) => ({ ...prev, password: "", confirmPassword: "", name: "", phone: "" }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={logo} alt="Finow" className="mx-auto mb-4 h-10 w-auto" width={233} height={70} fetchPriority="high" />
          <p className="mt-2 text-muted-foreground">Seu mentor financeiro pessoal</p>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMode("register")}>
                Criar conta
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Nome *</Label>
              <Input id="reg-name" value={form.name} onChange={set("name")} placeholder="Seu nome" required minLength={2} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email *</Label>
              <Input id="reg-email" type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Telefone</Label>
              <Input id="reg-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Senha *</Label>
              <Input id="reg-password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
              {form.password.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {passwordRules.map((rule, i) => (
                    <li key={rule.key} className="flex items-center gap-1.5">
                      {passed[i] ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={passed[i] ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">Confirmar senha *</Label>
              <Input id="reg-confirm" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" required />
              {form.confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !canSubmitRegister}>
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMode("login")}>
                Entrar
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

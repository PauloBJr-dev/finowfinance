import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", phone: "" });
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          toast.error(result.error.errors[0].message);
          return;
        }
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
        } else {
          navigate("/");
        }
      } else {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          toast.error(result.error.errors[0].message);
          return;
        }
        const { error } = await signUp(formData.email, formData.password, formData.name, formData.phone);
        if (error) {
          toast.error(error.message.includes("already registered") ? "Este email já está cadastrado" : error.message);
        } else {
          toast.success("Conta criada com sucesso!");
          navigate("/");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">F</span>
          </div>
          <h1 className="text-2xl font-semibold">Bem-vindo ao Finow</h1>
          <p className="mt-2 text-muted-foreground">Seu mentor financeiro pessoal</p>
        </div>

        <div className="flex rounded-lg bg-muted p-1">
          <button onClick={() => setIsLogin(true)} className={cn("flex-1 rounded-md py-2 text-sm font-medium transition-colors", isLogin ? "bg-background shadow-sm" : "text-muted-foreground")}>Entrar</button>
          <button onClick={() => setIsLogin(false)} className={cn("flex-1 rounded-md py-2 text-sm font-medium transition-colors", !isLogin ? "bg-background shadow-sm" : "text-muted-foreground")}>Criar conta</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="seu@email.com" required />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}</Button>
        </form>
      </div>
    </div>
  );
}

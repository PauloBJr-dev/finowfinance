import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PremiumGateProps {
  children: ReactNode;
  /** If true, renders inline (no MainLayout wrapper) */
  inline?: boolean;
  featureName?: string;
}

export function PremiumGate({ children, inline = false, featureName = "Esta funcionalidade" }: PremiumGateProps) {
  const { plan } = useAuth();
  const navigate = useNavigate();
  const isPremium = plan === "premium" || plan === "lifetime";

  if (isPremium) return <>{children}</>;

  const gate = (
    <Card className="mx-auto max-w-md border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Crown className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{featureName} é Premium</h2>
          <p className="text-sm text-muted-foreground">
            Faça upgrade para o plano Premium e desbloqueie todas as funcionalidades do Finow.
          </p>
        </div>
        <Button onClick={() => navigate("/#pricing")} className="gap-2">
          <Crown className="h-4 w-4" />
          Ver planos
        </Button>
      </CardContent>
    </Card>
  );

  if (inline) return gate;

  return (
    <MainLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        {gate}
      </div>
    </MainLayout>
  );
}

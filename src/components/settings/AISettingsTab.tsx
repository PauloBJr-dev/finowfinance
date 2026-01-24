import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Bell, TrendingUp, AlertCircle } from "lucide-react";
import { useAISettings, useUpdateAISettings, useAIUsage, useTodayUsage } from "@/hooks/use-ai";

export function AISettingsTab() {
  const { data: settings, isLoading: settingsLoading } = useAISettings();
  const { data: usage, isLoading: usageLoading } = useAIUsage(7);
  const { data: todayUsage } = useTodayUsage();
  const updateSettings = useUpdateAISettings();

  const handleToggle = (field: "categorization_enabled" | "reminders_enabled", value: boolean) => {
    updateSettings.mutate({ [field]: value });
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Agrupar uso por agente
  const usageByAgent = usage?.reduce((acc, u) => {
    acc[u.agent_name] = (acc[u.agent_name] || 0) + u.tokens_used;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalWeeklyUsage = Object.values(usageByAgent).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      {/* Status do Consumo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Consumo de IA
          </CardTitle>
          <CardDescription>
            Acompanhe o uso diário e semanal dos recursos de IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Uso de Hoje */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hoje</span>
              <span className="font-medium">
                {todayUsage?.total.toLocaleString()} / {todayUsage?.limit.toLocaleString()} tokens
              </span>
            </div>
            <Progress 
              value={todayUsage?.percentage || 0} 
              className="h-2"
            />
            {(todayUsage?.percentage || 0) >= 80 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Você está próximo do limite diário
              </div>
            )}
          </div>

          {/* Uso Semanal por Agente */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">Últimos 7 dias por agente</p>
            <div className="space-y-2">
              {Object.entries(usageByAgent).length > 0 ? (
                Object.entries(usageByAgent).map(([agent, tokens]) => (
                  <div key={agent} className="flex justify-between items-center">
                    <Badge variant="outline" className="capitalize">
                      {agent === 'categorization' ? 'Categorização' : 
                       agent === 'reminders' ? 'Lembretes' : agent}
                    </Badge>
                    <span className="text-sm font-mono">{tokens.toLocaleString()} tokens</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum uso registrado</p>
              )}
            </div>
            {totalWeeklyUsage > 0 && (
              <div className="mt-3 pt-3 border-t flex justify-between">
                <span className="text-sm font-medium">Total semanal</span>
                <span className="text-sm font-mono font-medium">
                  {totalWeeklyUsage.toLocaleString()} tokens
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações dos Agentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Agentes de IA
          </CardTitle>
          <CardDescription>
            Ative ou desative funcionalidades de inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Categorização */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="categorization" className="font-medium">
                  Sugestão de Categoria
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sugere automaticamente a categoria ao adicionar transações
                </p>
              </div>
            </div>
            <Switch
              id="categorization"
              checked={settings?.categorization_enabled ?? true}
              onCheckedChange={(checked) => handleToggle("categorization_enabled", checked)}
              disabled={updateSettings.isPending}
            />
          </div>

          {/* Lembretes */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reminders" className="font-medium">
                  Lembretes Inteligentes
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba lembretes sobre faturas próximas do vencimento
                </p>
              </div>
            </div>
            <Switch
              id="reminders"
              checked={settings?.reminders_enabled ?? true}
              onCheckedChange={(checked) => handleToggle("reminders_enabled", checked)}
              disabled={updateSettings.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Limite diário:</strong> {settings?.daily_token_limit?.toLocaleString() || '5.000'} tokens por usuário
              </p>
              <p>
                A IA apenas sugere categorias e envia lembretes. 
                <strong> Nenhuma ação é executada automaticamente.</strong>
              </p>
              <p>
                Seus dados financeiros são usados apenas para melhorar as sugestões e nunca são compartilhados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

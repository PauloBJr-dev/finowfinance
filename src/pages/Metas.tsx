import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { PremiumGate } from "@/components/shared/PremiumGate";
import { Target } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function Metas() {
  return (
    <PremiumGate featureName="Metas">
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Metas</h1>
              <p className="text-muted-foreground">Defina e acompanhe seus objetivos financeiros.</p>
            </div>
            <NotificationCenter />
          </div>
          <EmptyState
            icon={<Target className="h-8 w-8 text-muted-foreground" />}
            title="Em breve"
            description="Aqui você poderá criar metas financeiras e acompanhar seu progresso. Essa funcionalidade está sendo construída."
          />
        </div>
      </MainLayout>
    </PremiumGate>
  );
}

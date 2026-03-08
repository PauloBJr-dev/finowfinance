import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { PremiumGate } from "@/components/shared/PremiumGate";
import { PiggyBank } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function Cofrinho() {
  return (
    <PremiumGate featureName="Cofrinho">
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Cofrinho</h1>
              <p className="text-muted-foreground">Guarde dinheiro para seus sonhos.</p>
            </div>
            <NotificationCenter />
          </div>
          <EmptyState
            icon={<PiggyBank className="h-8 w-8 text-muted-foreground" />}
            title="Em breve"
            description="Seu cofrinho virtual para juntar dinheiro para objetivos específicos. Essa funcionalidade está sendo construída."
          />
        </div>
      </MainLayout>
    </PremiumGate>
  );
}

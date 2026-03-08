import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { Target } from "lucide-react";

export default function Metas() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Metas</h1>
          <p className="text-muted-foreground">Defina e acompanhe seus objetivos financeiros.</p>
        </div>
        <EmptyState
          icon={<Target className="h-8 w-8 text-muted-foreground" />}
          title="Em breve"
          description="Aqui você poderá criar metas financeiras e acompanhar seu progresso. Essa funcionalidade está sendo construída."
        />
      </div>
    </MainLayout>
  );
}

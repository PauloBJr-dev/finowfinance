import { MainLayout } from "@/components/layout/MainLayout";

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao Finow, seu mentor financeiro.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Saldo Total</p>
            <p className="text-2xl font-bold text-foreground">R$ 0,00</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

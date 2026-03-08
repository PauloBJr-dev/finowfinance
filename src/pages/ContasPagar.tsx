import { MainLayout } from "@/components/layout/MainLayout";
import { BillList } from "@/components/bills/BillList";
import { Card } from "@/components/ui/card";
import { useBillsSummary } from "@/hooks/use-bills";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function ContasPagar() {
  const [month] = useState(new Date());
  const { data: summary } = useBillsSummary(month);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas e compromissos.</p>
          </div>
          <NotificationCenter />
        </div>

        {/* Summary Cards */}
        {summary && summary.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A Vencer</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.pending)}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-lg font-semibold text-destructive">{formatCurrency(summary.overdue)}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagas</p>
                <p className="text-lg font-semibold text-success">{formatCurrency(summary.paid)}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Bills List */}
        <BillList />
      </div>
    </MainLayout>
  );
}

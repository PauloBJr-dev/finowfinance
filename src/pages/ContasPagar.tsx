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
        <div className="relative">
          <div className="pr-12">
            <h1 className="text-2xl font-semibold">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas e compromissos.</p>
          </div>
          <div className="absolute right-0 top-0">
            <NotificationCenter />
          </div>
        </div>

        {/* Summary Cards */}
        {summary && summary.total > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">A Vencer</p>
                <p className="text-sm sm:text-lg font-semibold truncate">{formatCurrency(summary.pending)}</p>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Vencidas</p>
                <p className="text-sm sm:text-lg font-semibold text-destructive truncate">{formatCurrency(summary.overdue)}</p>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Pagas</p>
                <p className="text-sm sm:text-lg font-semibold text-success truncate">{formatCurrency(summary.paid)}</p>
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

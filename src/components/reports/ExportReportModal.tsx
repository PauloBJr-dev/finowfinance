import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReports } from "@/hooks/use-reports";
import { useAuth } from "@/hooks/use-auth";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { startOfMonth, endOfMonth } from "date-fns";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

interface ExportReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportReportModal({ open, onOpenChange }: ExportReportModalProps) {
  const isMobile = useIsMobile();
  const { generatePDF, isGenerating } = useReports();
  const { plan } = useAuth();
  const isPremium = plan === "premium" || plan === "lifetime";
  const [dateRange, setDateRange] = useState({
    startDate: toDateStr(startOfMonth(new Date())),
    endDate: toDateStr(endOfMonth(new Date())),
  });

  const handlePeriodChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const handleGenerate = async () => {
    await generatePDF(dateRange.startDate, dateRange.endDate);
    onOpenChange(false);
  };

  const content = isPremium ? (
    <div className="space-y-6 p-1">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Período</label>
        <PeriodFilter onPeriodChange={handlePeriodChange} defaultPeriod="this_month" />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {isGenerating ? "Gerando..." : "Gerar PDF"}
      </Button>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Crown className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Relatórios PDF é uma feature Premium</p>
        <p className="text-sm text-muted-foreground">Faça upgrade para exportar relatórios em PDF.</p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Exportar Relatório</DrawerTitle>
            <DrawerDescription>
              Escolha o período e gere um relatório em PDF
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório</DialogTitle>
          <DialogDescription>
            Escolha o período e gere um relatório em PDF
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

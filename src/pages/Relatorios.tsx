import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { PremiumGate } from "@/components/shared/PremiumGate";
import { ReportPreview, type ReportPreviewData } from "@/components/reports/ReportPreview";
import { Button } from "@/components/ui/button";
import { useReports, useReportPreview } from "@/hooks/use-reports";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, FileDown, FileText, Sparkles } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function Relatorios() {
  const { plan } = useAuth();
  const isPremium = plan === "premium" || plan === "lifetime";
  const { generatePDF, isGenerating } = useReports();
  const { mutate: fetchPreview, data: previewData, isPending: isLoadingPreview, reset } = useReportPreview();

  const [dateRange, setDateRange] = useState({
    startDate: toDateStr(startOfMonth(new Date())),
    endDate: toDateStr(endOfMonth(new Date())),
  });

  const handlePeriodChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
    reset();
  };

  const handleAnalyze = () => {
    fetchPreview({ startDate: dateRange.startDate, endDate: dateRange.endDate });
  };

  const handlePDFWithAI = async () => {
    await generatePDF(dateRange.startDate, dateRange.endDate, true, previewData ?? undefined);
  };

  const handlePDFWithoutAI = async () => {
    await generatePDF(dateRange.startDate, dateRange.endDate, false);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-28 pt-6 md:px-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análise financeira com IA</p>
          </div>
          <NotificationCenter />
        </div>

        <PremiumGate inline featureName="Relatórios PDF">
          <div className="space-y-6">
            {/* Period + Analyze */}
            <div className="space-y-3">
              <PeriodFilter onPeriodChange={handlePeriodChange} defaultPeriod="this_month" />
              <Button onClick={handleAnalyze} disabled={isLoadingPreview} className="w-full gap-2 sm:w-auto">
                {isLoadingPreview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    O Mentor está analisando seus dados...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analisar período
                  </>
                )}
              </Button>
            </div>

            {/* Preview */}
            {previewData && <ReportPreview data={previewData as ReportPreviewData} />}

            {/* PDF Buttons */}
            {previewData && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={handlePDFWithAI} disabled={isGenerating} className="gap-2 flex-1">
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Gerar PDF completo
                </Button>
                <Button variant="outline" onClick={handlePDFWithoutAI} disabled={isGenerating} className="gap-2 flex-1">
                  <FileText className="h-4 w-4" />
                  Gerar sem análise IA
                </Button>
              </div>
            )}

            {/* Always available: PDF without AI */}
            {!previewData && !isLoadingPreview && (
              <div className="pt-2 border-t border-border">
                <Button variant="outline" onClick={handlePDFWithoutAI} disabled={isGenerating} className="gap-2">
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Gerar PDF sem análise IA
                </Button>
              </div>
            )}
          </div>
        </PremiumGate>
      </div>
    </MainLayout>
  );
}

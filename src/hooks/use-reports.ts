import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export function useReportPreview() {
  return useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const { data, error } = await supabase.functions.invoke("reports-preview", {
        body: { startDate, endDate },
      });

      if (error) {
        // Check for 429 in the error
        const msg = typeof error === "object" && "message" in error ? (error as any).message : String(error);
        if (msg.includes("429") || msg.includes("Limite")) {
          toast.error("Limite de análise IA atingido hoje. Tente novamente amanhã ou gere o relatório sem análise.");
          throw new Error("token_limit");
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes("Limite") || data.error.includes("tokens")) {
          toast.error("Limite de análise IA atingido hoje. Tente novamente amanhã ou gere o relatório sem análise.");
          throw new Error("token_limit");
        }
        throw new Error(data.error);
      }

      return data;
    },
    onError: (err: any) => {
      if (err.message !== "token_limit") {
        toast.error(err?.message || "Erro ao gerar prévia do relatório");
      }
    },
  });
}

export function useReports() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (
    startDate: string,
    endDate: string,
    includeAI = false,
    aiData?: any
  ) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("reports", {
        body: { startDate, endDate, includeAI, aiData: includeAI ? aiData : undefined },
      });

      if (error) throw error;

      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: "application/pdf" });
      } else {
        const errorMsg = typeof data === "object" && data?.error ? data.error : "Erro ao gerar relatório";
        throw new Error(errorMsg);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatório financeiro ${formatDate(startDate)} - ${formatDate(endDate)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Relatório gerado com sucesso!");
    } catch (err: any) {
      console.error("Error generating report:", err);
      toast.error(err?.message || "Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePDF, isGenerating };
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useReports() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (startDate: string, endDate: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("reports", {
        body: { startDate, endDate },
      });

      if (error) throw error;

      // data comes as a Blob or needs conversion
      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: "application/pdf" });
      } else {
        // Edge function may return JSON error
        const errorMsg = typeof data === "object" && data?.error ? data.error : "Erro ao gerar relatório";
        throw new Error(errorMsg);
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatório financeiro ${formatDateBR(startDate)} - ${formatDateBR(endDate)}.pdf`;
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

interface BenefitDeposit {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  date: string;
  working_days: number;
  daily_rate: number;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface BenefitDepositInsert {
  account_id: string;
  amount: number;
  date: string;
  working_days: number;
  description?: string;
}

const BENEFIT_DEPOSITS_KEY = ["benefit_deposits"];
const ACCOUNTS_KEY = ["accounts"];
const TRANSACTIONS_KEY = ["transactions"];

/**
 * Hook para listar depósitos de um cartão benefício
 * @param accountId ID da conta de benefício
 * @param month Mês no formato YYYY-MM (opcional, para filtro)
 */
export function useBenefitDeposits(accountId?: string, month?: string) {
  return useQuery({
    queryKey: [...BENEFIT_DEPOSITS_KEY, accountId, month],
    queryFn: async () => {
      let query = supabase
        .from("benefit_deposits")
        .select(`
          *,
          accounts (
            id,
            name
          )
        `)
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      if (month) {
        // Filtrar por mês: date >= YYYY-MM-01 AND date <= YYYY-MM-último dia
        const [year, monthNum] = month.split("-").map(Number);
        const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        
        query = query.gte("date", startDate).lte("date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (BenefitDeposit & { accounts: { id: string; name: string } })[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para criar um depósito de benefício
 * O trigger do banco de dados cria automaticamente a transação de receita
 */
export function useCreateBenefitDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deposit: BenefitDepositInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar nome da conta para a mensagem de sucesso
      const { data: account } = await supabase
        .from("accounts")
        .select("name, current_balance")
        .eq("id", deposit.account_id)
        .single();

      const { data, error } = await supabase
        .from("benefit_deposits")
        .insert({
          ...deposit,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Retornar com informações extras para a mensagem de sucesso
      return {
        deposit: data as BenefitDeposit,
        accountName: account?.name || "Cartão Benefício",
        newBalance: (account?.current_balance || 0) + deposit.amount,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: BENEFIT_DEPOSITS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      
      toast.success(
        `${formatCurrency(result.deposit.amount)} creditados no ${result.accountName}. Saldo: ${formatCurrency(result.newBalance)}`,
        { duration: 5000 }
      );
    },
    onError: (error) => {
      console.error("Erro ao criar depósito:", error);
      toast.error("Erro ao criar depósito. Tente novamente.");
    },
  });
}

/**
 * Hook para soft delete de depósito de benefício
 */
export function useDeleteBenefitDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("benefit_deposits")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BENEFIT_DEPOSITS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
    onError: (error) => {
      console.error("Erro ao excluir depósito:", error);
      toast.error("Erro ao excluir depósito. Tente novamente.");
    },
  });
}

/**
 * Hook para restaurar depósito de benefício
 */
export function useRestoreBenefitDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("benefit_deposits")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BENEFIT_DEPOSITS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      toast.success("Depósito restaurado!");
    },
    onError: (error) => {
      console.error("Erro ao restaurar depósito:", error);
      toast.error("Erro ao restaurar depósito. Tente novamente.");
    },
  });
}

/**
 * Hook para obter o total de saldo de todos os cartões benefício
 */
export function useBenefitCardsTotal() {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, "benefit_cards_total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, current_balance")
        .eq("type", "benefit_card")
        .is("deleted_at", null);

      if (error) throw error;
      
      const total = (data || []).reduce((sum, acc) => sum + Number(acc.current_balance), 0);
      return {
        accounts: data || [],
        total,
        count: data?.length || 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

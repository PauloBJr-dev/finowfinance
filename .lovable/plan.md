

# Plano: Corrigir 4 problemas de UX identificados

## 1. Máscara de Valor (CurrencyInput) — Bug principal

**Problema:** Ao digitar "5000", o input já contém texto formatado (ex: "R$ 50,00"). O `handleChange` extrai TODOS os dígitos da string formatada + os novos, gerando valores astronômicos (acumulação de dígitos).

**Solução:** Reescrever `CurrencyInput` para trabalhar com estado interno em centavos (inteiro). Ao digitar, usar apenas os dígitos puros acumulados. Ao receber focus, limpar a formatação e trabalhar com raw cents. Adicionar um **limite máximo de R$ 9.999.999,99** (999999999 centavos) para prevenir valores absurdos.

**Mudança principal no `handleChange`:**
- Extrair apenas dígitos do valor digitado
- Limitar a 9 dígitos (max ~R$ 10M)
- Converter centavos → reais e chamar `onChange`
- Formatar para exibição

---

## 2. Feedback de fechamento de modais

**Problema:** Após salvar conta ou transação, modal pode permanecer aberto.

**Correções:**
- **`AccountList.tsx`**: `handleCreate` e `handleUpdate` já fecham o form. Verificar que `onOpenChange` no `AccountForm` fecha ao concluir. Adicionar `onOpenChange(false)` no `onSuccess` caso falte.
- **`QuickAddModal.tsx`**: Já chama `onOpenChange(false)` no `handleSubmit`. OK.
- **`TransactionForm.tsx`**: Já chama `onOpenChange(false)`. OK.

Problema real: `AccountForm.handleSubmit` faz `await onSubmit(data)` mas se o pai (`AccountList`) já fecha, o form pode resetar antes de completar. Garantir que o fluxo é: mutate → sucesso → fechar modal → reset form.

---

## 3. Atualização otimista de saldo

**Problema:** Usuário pensa que o saldo demora a atualizar.

**Realidade:** O saldo é atualizado por trigger no banco (instantâneo ao INSERT). O `useCreateTransaction` já invalida `ACCOUNTS_KEY` no `onSuccess`. O "delay" percebido é o tempo do round-trip da query de revalidação.

**Solução:** Adicionar optimistic update no `useCreateTransaction`: no `onMutate`, calcular o novo saldo esperado e atualizar o cache de accounts imediatamente. No `onError`, reverter. No `onSettled`, invalidar para reconciliar.

---

## 4. Validação de campos obrigatórios no QuickAdd

**Problema:** Formulário permite avançar sem campos cruciais preenchidos em certas etapas.

**Correções:**
- Step 1: `canProceedStep1` já exige `amount > 0`. OK.
- Step 2: `canProceedStep2` exige `categoryId !== null`. OK.
- Step 3: `canProceedStep3` exige `accountId !== null`. OK.
- **Faltando:** No bill flow, step 2 não exige `description` para conta a pagar (deveria, pois `description` é o nome da conta). Adicionar validação.
- **Faltando:** Não há limite de valor no amount (ligado ao bug 1).
- **Faltando:** Descrição sem limite de caracteres — adicionar max 200 chars.

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/shared/CurrencyInput.tsx` | Reescrever lógica de máscara com centavos internos + limite |
| `src/hooks/use-transactions.ts` | Adicionar optimistic update para accounts no `useCreateTransaction` |
| `src/components/transactions/QuickAddModal.tsx` | Validação de description no bill flow + limite de chars |
| `src/components/accounts/AccountForm.tsx` | Garantir reset + close correto no fluxo de submit |


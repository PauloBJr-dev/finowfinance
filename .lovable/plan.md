

# Corrigir bug de exclusão de transação

Duas alterações cirúrgicas, apenas nos dois arquivos especificados.

---

## 1. `src/hooks/use-transactions.ts` — `useDeleteTransaction` (lines 273-281)

Substituir a `mutationFn` que usa Edge Function por soft delete direto com verificação de auth:

```typescript
mutationFn: async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  return id;
},
```

O restante do hook (`onSuccess`, `onError`) permanece inalterado.

---

## 2. `src/components/transactions/TransactionList.tsx` — `handleDelete` (lines 78-91)

Fechar o modal **antes** do await e envolver em try/catch:

```typescript
const handleDelete = async () => {
  if (!deleteTransaction) return;

  const txId = deleteTransaction.id;
  const txDescription = deleteTransaction.description || "Transação";

  setDeleteTransaction(null); // Fecha o modal imediatamente

  try {
    await deleteTransactionMutation.mutateAsync(txId);
    showUndoToast({
      message: `"${txDescription}" excluída`,
      onUndo: () => restoreTransactionMutation.mutate(txId),
    });
  } catch (error) {
    console.error("[handleDelete] Erro:", error);
  }
};
```

---

## Nenhum outro arquivo é alterado

`DeleteConfirmation`, `useRestoreTransaction`, `UndoToast` — todos permanecem intactos.


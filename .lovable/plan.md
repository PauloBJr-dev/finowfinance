
# Plano: Adicionar Estado de Erro com Retry na Página de Faturas

## Objetivo
Melhorar a experiência do usuário exibindo uma mensagem de erro amigável com opção de retry quando a query de faturas falhar, em vez de simplesmente renderizar uma lista vazia.

---

## Análise Atual

O hook `useInvoices` já retorna:
- `isError`: boolean indicando se houve erro
- `error`: objeto com detalhes do erro
- `refetch`: função para tentar novamente

A página `Faturas.tsx` atualmente só usa `data` e `isLoading`, ignorando estados de erro.

---

## Implementação

### Arquivo: `src/pages/Faturas.tsx`

**1. Extrair `isError`, `error` e `refetch` do hook:**

```typescript
const { 
  data: invoicesData, 
  isLoading, 
  isError, 
  error, 
  refetch 
} = useInvoices(
  selectedCardId ? { cardId: selectedCardId } : undefined
);
```

**2. Adicionar novo bloco de erro após o loading:**

Inserir uma verificação `if (isError)` que exibe:
- Ícone visual (AlertCircle)
- Título: "Erro ao carregar faturas"
- Descrição do erro (se disponível)
- Botão "Tentar novamente" que chama `refetch()`

```tsx
if (isError) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Faturas</h1>
          <p className="text-muted-foreground">Acompanhe suas faturas de cartão.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-medium">Erro ao carregar faturas</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {error instanceof Error 
              ? error.message 
              : "Não foi possível carregar suas faturas. Verifique sua conexão e tente novamente."}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
```

**3. Adicionar imports necessários:**

```typescript
import { AlertCircle, RefreshCw } from "lucide-react";
```

---

## Fluxo de Estados da Página

```text
[Início]
   │
   ▼
┌──────────────────┐
│  isLoading?      │──► Sim ──► [Skeleton Loading]
└──────────────────┘
   │ Não
   ▼
┌──────────────────┐
│  isError?        │──► Sim ──► [Tela de Erro + Retry]
└──────────────────┘
   │ Não
   ▼
┌──────────────────┐
│  invoices = 0?   │──► Sim ──► [Empty State]
└──────────────────┘
   │ Não
   ▼
[Lista de Faturas]
```

---

## Resultado Esperado

- Quando a API falhar (ex: erro de rede, timeout, RLS), o usuário verá uma mensagem clara
- O botão "Tentar novamente" permite recarregar sem refresh manual
- A mensagem de erro é específica quando disponível, ou genérica como fallback
- O design segue o padrão visual do Finow (cores, espaçamento, tipografia)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Faturas.tsx` | Extrair `isError`, `error`, `refetch` do hook e adicionar bloco condicional de erro |


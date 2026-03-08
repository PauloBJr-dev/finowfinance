

## Resultado do Teste: Bug encontrado na tela de Faturas

### O que funciona:
- "Faturas" aparece corretamente na sidebar
- Aba "Cartões" em Configurações funciona (cartão "Nubank teste" visível)
- Seletor de cartão na tela de Faturas exibe o cartão correto
- Navegação e layout estão corretos

### Bug encontrado:
A tela mostra **"Nenhuma fatura encontrada para este cartão"** mesmo com um cartão selecionado. O problema está em `src/pages/Faturas.tsx` linha 224:

```text
Linha 223: const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
Linha 224: const { data: invoices } = useInvoices(selectedCardId);  // ← BUG: selectedCardId é null
     ...
Linha 229: const activeCardId = selectedCardId ?? cards?.[0]?.id ?? null;  // ← valor correto, mas calculado DEPOIS do hook
```

O `useInvoices` recebe `selectedCardId` (sempre `null` no primeiro render), enquanto deveria receber `activeCardId` (que faz fallback para o primeiro cartão). Mas `activeCardId` é computado **depois** da chamada do hook.

### Correção:
Reordenar o código para que `activeCardId` seja computado **antes** do `useInvoices`, e passar `activeCardId` ao hook:

```typescript
const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
const activeCardId = selectedCardId ?? cards?.[0]?.id ?? null;   // ← mover para ANTES
const { data: invoices, isLoading: invoicesLoading } = useInvoices(activeCardId);  // ← usar activeCardId
const selectedCard = cards?.find((c) => c.id === activeCardId);
```

### Arquivo a editar:
- `src/pages/Faturas.tsx` (apenas 3 linhas reordenadas, nenhum outro arquivo tocado)


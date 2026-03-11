

# Corrigir formulários mobile de transação — Sheet fixo sem arrastar

## Problema
Os formulários de edição (TransactionForm) e adição (QuickAddModal) usam `Drawer` (vaul) no mobile, que possui gesto de arrastar para fechar. Isso causa fechamentos acidentais ao scrollar o formulário. Além disso, o conteúdo fica cortado por falta de scroll interno controlado.

## Solução
Substituir o `Drawer` por `Sheet` (bottom) nos dois componentes mobile. O Sheet não tem gesto de arrastar, ocupa ~90% da tela, permite scroll interno fluido e fecha apenas pelo botão X.

## Arquivos a modificar

### 1. `src/components/transactions/TransactionForm.tsx`
- Trocar `Drawer`/`DrawerContent`/`DrawerHeader`/`DrawerFooter` por `Sheet`/`SheetContent`/`SheetHeader`/`SheetFooter` com `side="bottom"`
- Adicionar `SheetTitle` (acessibilidade) e botão X para fechar
- Estilizar `SheetContent` com `h-[90vh] flex flex-col rounded-t-xl`
- Envolver `content` em `div` com `flex-1 overflow-y-auto` para scroll interno
- Footer fixo no fundo com `flex-shrink-0`

### 2. `src/components/transactions/QuickAddModal.tsx`
- Mesma substituição: `Drawer` → `Sheet` com `side="bottom"`
- Manter `max-h-[90vh]`, `flex flex-col`, scroll interno já existente
- Remover `dismissible` prop (não existe no Sheet)
- Manter botão X já existente

### Estrutura mobile resultante (ambos)
```text
┌──────────────────────┐
│  Título         [X]  │  ← SheetHeader fixo
├──────────────────────┤
│                      │
│  Campos do form      │  ← overflow-y-auto
│  (scroll interno)    │
│                      │
├──────────────────────┤
│  [🗑️] [Salvar]      │  ← Footer fixo
└──────────────────────┘
```

## O que NÃO muda
- Comportamento desktop (continua usando Dialog)
- Lógica de submit, validação, estados
- Visual dos campos internos (espaçamento, labels, inputs)


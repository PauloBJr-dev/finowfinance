
# Plano de Refatoração: Quick Add Modal Responsivo

## Resumo Executivo

Refatorar completamente o layout do Quick Add para garantir que funcione perfeitamente em todas as telas, eliminando cortes e sobreposições, mantendo o tom calmo e confortável do Design System Finow.

---

## Problemas Identificados

| Problema | Arquivo | Impacto |
|----------|---------|---------|
| Modal sem `max-height` controlado | QuickAddModal.tsx | Conteúdo pode estourar a viewport |
| Conteúdo sem scroll interno | QuickAddModal.tsx | Botões ficam cortados |
| Grid de categorias fixo (4 colunas) | CategorySelect.tsx | Muito apertado no mobile |
| Todos os 7 métodos de pagamento visíveis | PaymentMethodSelect.tsx | Ocupa muito espaço vertical |
| Drawer mobile sem limite de altura | QuickAddModal.tsx | Pode crescer indefinidamente |

---

## Solução Proposta

### Fase 1: Estrutura do Modal/Drawer

**Arquivo: `QuickAddModal.tsx`**

Aplicar controles de altura e scroll:

```text
Desktop (Dialog):
+----------------------------------+
| Header (fixo)                    |
+----------------------------------+
| Conteúdo scrollável              |
| max-h: calc(90vh - header)       |
| overflow-y: auto                 |
| padding-bottom: extra            |
+----------------------------------+

Mobile (Drawer):
+----------------------------------+
| Handle + Header                  |
+----------------------------------+
| Conteúdo scrollável              |
| max-h: 85vh                      |
| overflow-y: auto                 |
| pb-safe (safe area)              |
+----------------------------------+
```

Alteracoes:
- DialogContent: adicionar `max-h-[90vh] flex flex-col overflow-hidden`
- Conteudo interno: wrapper com `flex-1 overflow-y-auto pb-6`
- DrawerContent: adicionar `max-h-[85vh]`
- Conteudo do drawer: mesmo wrapper scrollavel

---

### Fase 2: Categorias Responsivas

**Arquivo: `CategorySelect.tsx`**

Grid adaptativo com scroll interno:

| Breakpoint | Colunas |
|------------|---------|
| Mobile (<640px) | 2 colunas |
| Tablet (640-768px) | 3 colunas |
| Desktop (>768px) | 4 colunas |

Alteracoes:
- Classe do grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`
- Container: `max-h-48 overflow-y-auto` (altura maxima com scroll)
- Cards: reduzir padding de `p-3` para `p-2` no mobile

---

### Fase 3: Metodos de Pagamento Compactos

**Arquivo: `PaymentMethodSelect.tsx`**

Mostrar apenas os 4 principais inicialmente:

| Visivel | Escondido |
|---------|-----------|
| Pix/TED | Boleto |
| Debito | Voucher |
| Credito | Dividido |
| Dinheiro | |

Alteracoes:
- Estado `showMore` para controlar expansao
- Metodos primarios: transfer, debit, credit_card, cash
- Botao "Outras formas" para expandir
- Grid: `grid-cols-2 sm:grid-cols-4` (2 colunas mobile, 4 desktop)

---

### Fase 4: Ajustes de Espacamento

**Arquivo: `QuickAddModal.tsx`**

Reducoes para caber melhor em telas pequenas:

| Elemento | Antes | Depois |
|----------|-------|--------|
| Gap principal | `gap-6` | `gap-4` |
| Padding container | `p-4` | `p-4 pb-8` (extra bottom) |
| Space-y das etapas | `space-y-6` | `space-y-4` |

---

## Detalhes Tecnicos

### Arquivos a Modificar

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/components/transactions/QuickAddModal.tsx` | Estrutura, espacamento, wrappers |
| `src/components/shared/CategorySelect.tsx` | Grid responsivo, max-height |
| `src/components/shared/PaymentMethodSelect.tsx` | Estado showMore, metodos primarios |

### Validacoes a Manter

- Validacao de step 1: `amount > 0`
- Validacao de step 2: `categoryId !== null`
- Validacao de step 3: conta ou cartao selecionado
- Logica de parcelamento intacta

### O Que NAO Sera Alterado

- Regras de negocio (parcelamento, faturas, etc.)
- Campos obrigatorios
- Numero de etapas (permanece 3)
- Integracao com IA (sugestao de categoria)
- Hooks e logica de submit

---

## Resultado Visual Esperado

### Mobile (iPhone SE - 375px)

```text
+---------------------------+
| [X]  Nova transacao       |
+---------------------------+
| [Despesa] [Receita]       |
+---------------------------+
| R$ 0,00                   |
+---------------------------+
| 📅 24 de janeiro de 2026  |
+---------------------------+
|                           |
|     [ Continuar ]         |
|                           |
+---------------------------+
```

### Step 2 - Categorias (Mobile)

```text
+---------------------------+
| ← Voltar                  |
+---------------------------+
| Categoria                 |
| +----------+----------+   |
| | 🛒 Mercado| 🚗 Transp|   |
| +----------+----------+   |
| | 🏠 Casa  | 🍽️ Aliment|   | <- scrollavel
| +----------+----------+   |
+---------------------------+
| Forma de pagamento        |
| [Pix] [Debito] [Credito]  |
| [Dinheiro]                |
|      [+ Outras formas]    |
+---------------------------+
| Descricao (opcional)      |
| [__________________]      |
+---------------------------+
|     [ Continuar ]         |
+---------------------------+
```

---

## Beneficios

1. **Usabilidade**: Nenhum conteudo cortado ou escondido
2. **Acessibilidade**: Respeita safe areas do iOS
3. **Performance**: Sem re-renders desnecessarios
4. **Manutencao**: Segue padroes mobile-first
5. **UX**: Tom calmo preservado, sem densidade visual excessiva

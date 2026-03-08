

## Plan: Add credit card support to QuickAddModal

### Critical column name corrections from user spec
The user spec contains two wrong column names that must be corrected:
- `installment_count` → `total_installments` (in `installment_groups` table)
- `installment_group_id` → `group_id` (in `installments` table)

### Changes — single file: `src/components/transactions/QuickAddModal.tsx`

**1. New imports** (lines 1-24)
- Add: `useCards`, `getOrCreateInvoice`, `getTargetInvoiceMonth`, `getInstallmentMonths`, `distributeInstallments`, `formatInvoiceMonth`
- Add: `useAuth` for `user.id`, `useQueryClient` for cache invalidation, `supabase` for direct inserts, `toast` from sonner
- Add: `AlertTriangle` icon from lucide for no-cards alert

**2. New state** (after line 52)
- `selectedCardId: string` (default `''`)
- `installmentCount: number` (default `1`)
- `isSubmittingCard: boolean` (default `false`) — separate loading state for credit card flow

**3. Reset logic** (lines 61-74 and 77-85)
- Add `selectedCardId = ''` and `installmentCount = 1` to modal close reset
- Add reset when `paymentMethod` changes away from `credit_card`

**4. Step 2 UI — credit card fields** (after PaymentMethodSelect, ~line 287)
When `paymentMethod === 'credit_card'`:
- Card dropdown (Select) — required
- Installment dropdown (1x..24x) — default 1x
- Installment preview when count > 1: list with month labels + amounts + total footer

**5. Step 3 — conditional**
- When `paymentMethod === 'credit_card'`: skip account selection, go straight to confirmation + submit
- `canProceedStep3` updated: `paymentMethod === 'credit_card' ? !!selectedCardId : !!accountId`
- Actually, for credit card flow, Step 3 shows card summary + confirm button (no account select)

**6. handleSubmit — credit card branch** (lines 92-117)
Before the existing `if (isBillFlow)` block, add credit card handling:

A) **Single payment (1x)**: get target month → get/create invoice → insert transaction with `card_id`, `invoice_id`, `account_id: null`

B) **Installments (>1x)**: insert main transaction (no invoice_id) → create installment_group → loop creating each installment with correct invoice_id per month

Both paths invalidate `transactions` and `invoices` query keys, then close modal.

**7. Validation updates**
- `canProceedStep2` for credit card: needs `selectedCardId` to be set
- `totalSteps`: credit card flow = 3 (value → details+card → confirm)

### Files NOT modified
- `src/lib/invoice-cycle.ts` — untouched
- `src/hooks/use-invoices.ts` — untouched
- No other files changed


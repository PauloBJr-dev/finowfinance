

## Analysis: Client-Side Validation Gaps

After reviewing all hooks, forms, and edge functions, here is the security audit of validation that exists only on the client and should be duplicated/enforced on the backend.

---

### Critical Findings

#### 1. **Bills (use-bills.ts) — No backend Edge Function at all**
The entire bills CRUD (`useCreateBill`, `usePayBill`, `useDeleteBill`, `useRestoreBill`) operates directly against Supabase tables via the JS client. There is **no Edge Function** performing server-side validation. This means:
- `amount` is not validated server-side (could be 0, negative, or absurdly large)
- `description` length (200 char limit) is only enforced by `input.slice(0, 200)` in QuickAddModal UI
- `category_id` is not verified to belong to the user
- `due_date` is not validated as a proper date
- **PayBill** — the multi-step operation (fetch bill → create transaction → update bill status) runs entirely client-side with no atomicity guarantee. If the update fails after the transaction insert, data becomes inconsistent.
- `is_recurring` creates 6 bills client-side — a malicious client could modify this to create unlimited bills.

**Risk: HIGH** — Business logic bypass, data inconsistency, potential abuse.

#### 2. **Transactions (use-transactions.ts) — Bypasses existing Edge Function**
The `transactions` Edge Function has proper validation (amount > 0, valid type/payment_method, etc.), but the hooks **don't use it**. They call `supabase.from("transactions").insert()` directly, completely bypassing the Edge Function's validation.

- `useCreateTransaction` — inserts directly, no amount/type/payment_method validation
- `useUpdateTransaction` — updates directly, no field validation
- `useDeleteTransaction` / `useRestoreTransaction` — direct table operations

**Risk: HIGH** — The Edge Function validation is dead code; all mutations skip it.

#### 3. **Accounts (use-accounts.ts) — Bypasses existing Edge Function**
Same pattern: the `accounts` Edge Function validates name length, account type, etc., but hooks call `supabase.from("accounts")` directly.

- `useCreateAccount` — no name length, type, or balance validation
- `useUpdateAccount` — no validation at all

**Risk: MEDIUM** — RLS protects user isolation, but invalid data can be inserted.

#### 4. **Profile (use-profile.ts) — No backend validation**
`useUpdateProfile` sends updates directly. The client-side zod schema validates name (2-100 chars), but the backend has no validation. A crafted request could set name to empty string or inject very long strings.

**Risk: LOW** — RLS limits to own profile, but data integrity is not enforced.

#### 5. **TransactionForm (edit) — Client-only validation**
The edit form validates `amount > 0` only via disabled button state. The `useUpdateTransaction` hook sends raw updates to Supabase with no validation.

**Risk: MEDIUM** — Invalid amounts or types could be written.

---

### Recommended Plan

#### Phase 1: Route hooks through Edge Functions (highest impact)

**1a. Bills Edge Function** — Create `supabase/functions/bills/index.ts`
- POST: Validate amount > 0, description (2-200 chars, required), category_id exists and belongs to user, due_date is valid date, is_recurring boolean, cap recurring at 6
- POST /pay: Atomic operation — fetch bill, create transaction, update bill status in a single function with rollback on failure
- DELETE: Soft delete with user ownership check
- PATCH: Restore with user ownership check

**1b. Redirect transaction hooks** to use the existing Edge Function
- `useCreateTransaction` → `supabase.functions.invoke('transactions', { method: 'POST', body })` 
- `useUpdateTransaction` → `supabase.functions.invoke('transactions', { method: 'PUT', body })`
- `useDeleteTransaction` → `supabase.functions.invoke('transactions', { method: 'DELETE' })`

**1c. Redirect account hooks** to use the existing Edge Function
- Same pattern as transactions

#### Phase 2: Add missing backend validations

- **Description length**: Max 200 chars enforced in transactions and bills Edge Functions
- **Category ownership**: Verify `category_id` belongs to user or is system category before insert
- **Account ownership**: Verify `account_id` belongs to user before associating with transaction
- **Date validation**: Ensure dates are valid ISO strings, not in unreasonable past/future
- **Amount precision**: Cap at 2 decimal places, max value (e.g., 999,999,999.99)

#### Phase 3: Profile Edge Function
- Create or extend validation for profile updates (name 2-100 chars, phone format optional validation)

---

### Summary Table

| Entity | Client Validation | Backend Validation | Gap |
|---|---|---|---|
| Transactions | Minimal (button disable) | Edge Function exists but unused | Hooks bypass Edge Function |
| Accounts | Zod schema in form | Edge Function exists but unused | Hooks bypass Edge Function |
| Bills | UI-only (button disable, slice) | **None — no Edge Function** | Complete gap |
| Profile | Zod schema in form | **None** | No server validation |
| Pay Bill | UI-only | **None** | Multi-step non-atomic operation |




## Plan: Registration Edge Function, Payment Hardening, and File Upload Edge Function

### Current State Assessment

1. **Registration**: Uses `supabase.auth.signUp()` directly from `use-auth.tsx` — no server-side validation on name, email format, password strength, or phone.
2. **Payment processing**: Already moved to `bills/pay` Edge Function with atomic logic and rollback. **No changes needed.**
3. **File uploads**: The `transactions.attachments` column exists but no storage bucket or upload mechanism is implemented.

---

### Task 1: Registration Edge Function

**New file:** `supabase/functions/register/index.ts`
- Validate: email format, password (min 8 chars, at least 1 number + 1 letter), name (2-100 chars trimmed), phone (optional, max 20 chars, digits/+/- only)
- Call `supabase.auth.admin.createUser()` using service role key (or `signUp` via anon client)
- Return sanitized response (no internal error details)
- Rate-limit awareness: return 429 if same email tried too many times (lightweight, via recent audit_logs check)

**Update:** `supabase/config.toml` — add `[functions.register]` with `verify_jwt = false` (public endpoint)

**Update:** `src/hooks/use-auth.tsx` — change `signUp` to invoke the `register` Edge Function instead of calling `supabase.auth.signUp()` directly

### Task 2: Payment Processing — Already Done

The `bills/pay` Edge Function already handles atomic payment with rollback. The `PayBillModal` already calls it via `usePayBill` → `supabase.functions.invoke('bills/pay')`. No further work needed.

### Task 3: File Upload Edge Function + Storage

**Migration SQL:**
- Create storage bucket `attachments` (private)
- RLS policies: users can upload to `{user_id}/` path, read own files, delete own files

**New file:** `supabase/functions/upload-attachment/index.ts`
- Accept multipart/form-data with a single file
- Validate: file size (max 5MB), allowed MIME types (image/jpeg, image/png, image/webp, application/pdf)
- Validate: filename length, sanitize filename
- Upload to `attachments/{user_id}/{uuid}-{sanitized_name}`
- Return the public URL path for storage in `transactions.attachments`

**Update:** `supabase/config.toml` — add `[functions.upload-attachment]` with `verify_jwt = false`

---

### Summary of Changes

| File | Action |
|---|---|
| `supabase/functions/register/index.ts` | Create — registration with validation |
| `supabase/functions/upload-attachment/index.ts` | Create — file upload with validation |
| `supabase/config.toml` | Add 2 function entries |
| `src/hooks/use-auth.tsx` | Route `signUp` through Edge Function |
| SQL migration | Create `attachments` storage bucket + RLS |


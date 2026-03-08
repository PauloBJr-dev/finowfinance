

## Performance Analysis — Finow

### 1. Duplicate / Redundant Network Calls

| Issue | Where | Impact |
|-------|-------|--------|
| **`check-subscription` polls every 60s** even when the user is just reading the dashboard. | `use-auth.tsx` L49 | 1 edge-function call/min forever. Cold-start latency on each call. |
| **`useBillsSummary` receives `new Date()` on each render.** The memo fix from memory was applied, but the `month?.toISOString()` in the queryKey (L99 `use-bills.ts`) still changes every millisecond if `month` is a fresh `Date` object — causing the query to re-fire on every Dashboard re-render triggered by the 60s subscription poll. | Dashboard L47 + `use-bills.ts` L99 | Duplicate bills fetch on each auth poll cycle. |
| **`RecentTransactionsCard` makes its own `useTransactions({ limit: 5 })` call**, separate from the dashboard's `useTransactions` (full month). Two parallel queries to the same table on mount. | `RecentTransactionsCard.tsx` L9 | Extra DB round-trip on every dashboard load. |
| **`useReminders` calls `supabase.auth.getUser()`** inside the queryFn (L227 `use-ai.ts`), which is a network call to `/auth/v1/user`. Same pattern in `useAISettings`, `useAIUsage`, `useTodayUsage`, `useUnreadRemindersCount` — up to 5 extra `/auth/v1/user` hits on first load. | `use-ai.ts` L59, L128, L155, L227, L258 | 5 redundant auth round-trips. User is already in context. |

**Recommendations:**
- Increase subscription poll interval to 5 min (or use a visibility-based approach — only poll when tab is visible).
- Pass `user.id` from `useAuth()` instead of calling `supabase.auth.getUser()` inside every queryFn.
- Stabilize the `month` reference in Dashboard with `useMemo` so `useBillsSummary` queryKey doesn't change.
- Consider deriving the recent-5 transactions from the already-fetched month array instead of a second query.

---

### 2. Re-rendering Hot Spots

| Issue | Where |
|-------|-------|
| **Dashboard re-renders every 60s** because `checkSubscription` updates `plan`/`subscribed` state in AuthContext, which re-renders every consumer. Even when the response is identical (`plan: "free"`), `setSubscribed`/`setPlan` always fires. | `use-auth.tsx` L38-40 |
| **`useBills` hook depends on `useAuth()`**, so any auth context change triggers a re-render of `BillList` and all its children. | `use-bills.ts` L56 |
| **`TransactionItem` is not memoized.** On the Transacoes page, all items re-render when any filter or parent state changes. | `TransactionItem.tsx` |

**Recommendations:**
- In `checkSubscription`, compare new values with current state before calling `set*` (bail-out pattern).
- Wrap `TransactionItem` in `React.memo`.
- Memoize expensive derived values in Dashboard (`expenses`, `income`, `balance`, `benefitBalance`) with `useMemo` — currently they recompute on every render even if `transactions`/`accounts` haven't changed.

---

### 3. Assets & Bundle

| Issue | Impact |
|-------|--------|
| **Logo images imported as static assets** (`@2x` PNGs: `finow-logo-light@2x.png`, `finow-logo-dark@2x.png`) are always bundled even though most users only see one theme. | Slightly larger initial bundle. |
| **Google Fonts loaded as external CSS** with `media="print"` trick — this is fine but the font file itself (`Inter 4 weights`) is ~100KB+ download. | Blocks text rendering until font loads (FOIT). |
| **All Lucide icons imported individually** — tree-shaking handles this well, but there are 15+ icon imports in Dashboard alone. | Minor. |
| **No image optimization** — PNGs in `public/images/` range from 32px to 512px. No WebP/AVIF variants. | Slower on mobile networks. |

**Recommendations:**
- Add `font-display: swap` fallback (already using `display=swap` in Google Fonts URL — good).
- Consider converting logo PNGs to WebP or inline SVG.
- No critical bundle issue; lazy loading is already in place for all routes.

---

### 4. Query Architecture

| Issue | Where |
|-------|--------|
| **No `staleTime` on `useBills`** (L58 `use-bills.ts`) — defaults to 0, meaning every mount triggers a refetch. | `use-bills.ts` |
| **`useBillsSummary` also has no `staleTime`** — same problem. | `use-bills.ts` L98 |
| **`usePreviousMonthTotals` has 5 min staleTime** but `useTransactions` has only 1 min — causes asymmetric staleness between KPI comparison badge and actual values. | `use-dashboard-data.ts` vs `use-transactions.ts` |

**Recommendations:**
- Add `staleTime: 2 * 60 * 1000` to `useBills` and `useBillsSummary`.
- Align staleTime across dashboard queries (suggest 2 min for all dashboard data).

---

### 5. Summary of Quick Wins (ordered by impact)

1. **Stop calling `supabase.auth.getUser()` in queryFns** — use `user.id` from context. Saves ~5 network calls per page load.
2. **Bail-out in `checkSubscription`** when values haven't changed — eliminates cascading re-renders every 60s.
3. **Add `staleTime` to `useBills`/`useBillsSummary`** — prevents duplicate fetches on navigation.
4. **Stabilize `useBillsSummary` month reference** in Dashboard with `useMemo`.
5. **Increase subscription poll to 5 min** or poll only when tab is visible (`document.visibilityState`).
6. **`React.memo` on `TransactionItem`** — prevents unnecessary list re-renders.
7. **Memoize derived dashboard values** (`expenses`, `income`, `balance`) with `useMemo`.
8. **Derive recent transactions from existing data** instead of a second query.


# Filters Remake Plan (Leads & Clients)

## Current State (observations)
- Leads page uses `ContactListFilter.tsx`; Clients page uses `ClientListFilter.tsx`. Both rely on `ToggleFilterButton`, so only one option per category can be active at a time.
- Services interested filter sends a single `services_interested@cs` value; multi-select UX does not exist even though the Supabase data provider supports combining multiple services via `@or` keys and already defaults to showing all leads when no services filter is present.
- Account manager filter is hardcoded to “Me”; no way to pick multiple managers. Tag filter is single-select per click (last click wins). Last activity and status are mutually exclusive choices.
- Clients filter only covers search, last activity, archive status, tags, tasks, and “Me” account manager—no services or client status selections.

## Requirements to meet
- Default: show all leads (no implicit filters). Leads with no `services_interested` must appear when no services filter is set.
- Filters needed on both Leads and Clients pages: Last Activity, Status, Services Interested In, Tags, Tasks, Account Manager.
- Multi-select required for Status, Last Activity, Services Interested In. Other filters should allow adding/removing multiple values without wiping the rest.
- UX must support adding and removing multiple chips/options easily.

## Proposed filtering behavior
- **Last Activity (multi-select):** Treat selections as OR buckets (e.g., Today OR This week). Convert selections into `@or` entries with unique keys for `last_seen` (`contacts/clients`) or `updated_at` (lead journey) ranges. No selection → no date filter.
- **Status (multi-select):**
  - Leads: use `leadStages` values; combine with OR (`@or` of `lead_stage` equality) or an `@in` helper if supported.
  - Clients: use `clientStatuses` when available; keep archived/unarchived as an additional boolean toggle (`hasArchivedDeals`).
- **Services Interested In (multi-select):** Build an `@or` map of `services_interested@cs` values (e.g., `{ services_interested@cs: "{1}", services_interested@cs_2: "{3}" }`). When the selection is empty, omit the key so all leads/clients (including those with empty/NULL services) remain visible.
- **Tags:** Allow selecting multiple tags; combine with OR (`tags@cs` entries in `@or`) so any selected tag matches. Consider supporting AND via `tags@cs` array intersection if needed—confirm with product.
- **Tasks:** Keep “with pending tasks” toggle; optionally add “no pending tasks” for completeness if requested.
- **Account manager:** Replace “Me” toggle with a multi-select of sales reps (still include quick “Me”). Encode as OR on `sales_id` or `sales_id@in`.
- **Search stays separate** via `q`.

## UI/UX approach
- Replace vertical lists of `ToggleFilterButton`s with reusable filter sections using checkable chips or checkbox lists inside a compact panel. Each section shows selected count and provides “Clear” per section.
- Show active selections as removable badges near the top (optional) so users can clear in one click.
- Keep layout similar width (`w-52`) to minimize layout churn; ensure scrollable if long lists (tags/services).

## Implementation steps
1) Build reusable helpers:
   - `MultiSelectFilter` component to manage selected values, render checkbox list/chips, and call `setFilters` with merged OR logic while preserving other filters.
   - Utility to build `@or` objects with stable keys for multi-select fields (services, status, tags, account managers).
2) Leads (contacts): rewrite `ContactListFilter.tsx` to use new components for Last Activity, Status, Services Interested, Tags, Tasks, Account Manager. Ensure no default filters are set.
3) Clients: rewrite `ClientListFilter.tsx` with the same UX, adding Services Interested and Status (clientStatuses), plus existing archive toggle.
4) Data layer: verify Supabase `dataProvider.ts` handles new multi-select payloads (`@or` keys for statuses/tags/managers). Add small helpers if needed (e.g., support `lead_stage@in`, `tags@cs` in OR, `sales_id@in`). Keep services logic unchanged but ensure it recognizes the new multi-key pattern.
5) QA / testing checklist:
   - With no filters, leads with empty `services_interested` appear.
   - Selecting multiple statuses returns union of matches.
   - Selecting multiple services returns union; clearing restores all results.
   - Combined filters (e.g., status + services + tags) persist together and can be individually cleared.
   - Account manager multi-select works for “Me” and another rep simultaneously.
   - Clients page mirrors behavior; archive toggle still works alongside other filters.






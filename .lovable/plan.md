## Change

Replace the single **Qty** column in the Stock Control movements table with two columns: **Initial Qty** and **Final Qty**, computed as the running per-warehouse balance before and after each movement.

## Where

- `src/routes/stock.tsx` — movements table only. Dashboard and Excel export are unchanged.

## How it works

For every row, compute:
- `finalQty` = sum of `quantity` for all movements with the same `productId` + `warehouseId`, dated on/before this movement (ordered by date, then insertion order/id), including this one.
- `initialQty` = `finalQty − thisMovement.quantity`.

This gives:
- Purchase of 100 (new item) → Initial 0, Final 100.
- No further movement → the row still shows 0 → 100 (it doesn't change over time).
- Later adjustment of +20 → Initial 100, Final 120.
- Sale of 5 → Initial 120, Final 115.
- Transfer legs are handled per warehouse: outgoing leg shows the source warehouse decreasing, incoming leg shows the destination increasing (each row uses its own `warehouseId`).

Rendering:
- Two right-aligned monospace columns replacing today's Qty column.
- Adjustment rows already carry `fromQty`/`toQty`; we'll use those when present to stay consistent with what the user typed, otherwise fall back to the computed balance.

## Implementation notes (technical)

- Precompute a `Map<"productId|warehouseId", sortedMovements[]>` once from `ms` (already filtered to the active company), sorted ascending by `date` then `id`, with a cumulative running total per entry. Look up each rendered row's `{initial, final}` from that map by movement id — O(n) build, O(1) per row.
- Update the `TableHeader` to have `Initial Qty` and `Final Qty` cells (both sortable via the existing `use-table-sort` hook on the computed final value; initial is derived).
- Remove the current single Qty cell and the special adjustment `X → Y` rendering (the two columns now express the same thing uniformly).
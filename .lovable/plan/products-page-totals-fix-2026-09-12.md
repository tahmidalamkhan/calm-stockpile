# Products Page Totals Fix

## Goal
Make inventory value visible on the Products page by adding a per-product value column and a clear footer grand total.

## Changes
1. Add a **Total value** column to the Products table.
   - Value per row = `unit price × on-hand quantity`.
   - Right-aligned, formatted as a plain number (no currency symbol).
2. Update the table footer.
   - Keep **Total unit price** (sum of all unit prices).
   - Rename/keep **Total inventory value** (sum of all `price × on-hand`).
   - Place each total under the correct column so the layout is obvious.
3. Ensure totals recalculate immediately when prices are edited in Edit mode.

## Files to modify
- `src/routes/products.tsx`

## Verification
- Open `/products`.
- Confirm every product row shows a **Total value**.
- Confirm the footer shows **Total unit price** and **Total inventory value**.
- Edit a unit price and verify both totals update.

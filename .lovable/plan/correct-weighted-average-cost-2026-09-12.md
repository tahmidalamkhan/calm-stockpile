# Correct weighted average cost

## Goal
Make SKU `-003 far` use the agreed weighted-average formula:

`39,500 total received value ÷ 360 total received units = 109.72 per unit`

Selling 10 units leaves 350 units valued at approximately `38,402`, without changing the 109.72 average.

## Plan
1. Use the complete receipt history for each product as the source of truth, rather than the Products page’s limited in-memory movement list.
2. Count every valid inventory receipt once, including regular purchases, bulk-stock purchases, opening stock, and priced positive adjustments; exclude sales, stock-outs, and both sides of transfers.
3. Recalculate and save `avg_cost` after every receipt, while leaving it unchanged after sales, stock-outs, or transfers.
4. Make Products, inventory totals, and Stock History use the same receipt classification and transaction prices so their figures reconcile.
5. Add a clear calculation check for the affected product: received quantity 360, received value 39,500, average 109.72, on hand 350, inventory value about 38,402.
6. Verify regular stock-in and Excel bulk stock-in both update the average immediately and do not rewrite historical movement prices.

## Technical details
- Remove dependence on the company-wide 1,000-movement client limit for average-cost calculations.
- Keep each movement’s saved unit price immutable.
- Round the displayed unit average to two decimals while calculating inventory value from the unrounded average to avoid cumulative rounding drift.

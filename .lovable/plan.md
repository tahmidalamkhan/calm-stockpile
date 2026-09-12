# Average cost that follows your real purchase prices

Today the average cost of a product only changes when someone types a new number. If you buy the same item at a different price, the stored figure stays stale and stock value is wrong. This plan makes it update itself on every stock-in, while still letting an admin correct it by hand.

## How it will work

- Each line in the Stock in window gets its own **Unit cost** box (the price you actually paid for that receipt).
- When the stock in is saved, the product's average cost is recalculated:

```text
new average = (current qty x current average + received qty x paid price)
              / (current qty + received qty)
```

- Stock out, transfers and recounts do not change the average cost — only receipts do.
- Bulk Excel import already has a cost per row; it will feed the same calculation instead of overwriting the average outright.
- An admin can still open Edit product and type an average cost directly; that value is kept until the next receipt recalculates it.
- The cost entered per line is stored on the movement, so stock history and reports show what was really paid at that time.

## Where it shows up

- Products page: unit price, total value and total inventory value reflect the recalculated average.
- Dashboard stock value and warehouse stock value use the same figure.
- Stock history shows the actual price paid on each transaction line, not the product's current average. Buying and selling totals are built from those per-transaction prices.

## Technical notes

- `StockAdjustDialog.tsx`: add a per-line `unitCost` field, used only in "in" mode; movements are inserted with that `unit_cost` instead of 0.
- `src/lib/mock/store.tsx`: add a helper that, after inserting purchase/stock-in movements, computes the weighted average across all warehouses for the affected product and writes `avg_cost` back to `products`. Quantity used is the on-hand total before the receipt, so the math stays correct when several lines hit the same product.
- `BulkStockImportDialog.tsx`: route `row.cost` through the same helper rather than setting `avgCost` directly.
- `NewProductDialog.tsx`: opening stock keeps setting the initial average from the entered price (first receipt).
- `EditProductDialog.tsx`: Avg cost stays editable for admins; no change needed beyond keeping it writing to `avg_cost`.
- Zero or blank cost on a line is treated as "no price given" and is skipped in the average so it cannot drag the value to zero.

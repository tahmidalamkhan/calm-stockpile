# Bulk import by SKU, warehouse-wise

## Flow
- User picks one destination **warehouse** in the dialog (as today).
- User uploads an Excel file with columns: `sku`, `name`, `quantity`, `cost`.
- One file = one warehouse. To stock the same products in another warehouse, the user runs the import again and picks that warehouse. The same SKU naturally ends up in multiple warehouses because stock movements are per `(productId, warehouseId)`.

## SKU matching rules
For each row:
1. **SKU required.** Rows with no SKU → marked `invalid` ("Missing SKU").
2. Look up an existing product by `sku` (case-insensitive, trimmed).
   - **Found** → status `existing`. Create a stock adjustment movement into the chosen warehouse using that `productId`. The product itself is not duplicated, so the same SKU now has stock in this warehouse in addition to wherever it already existed.
   - **Not found** → status `new`. Create a new product using the SKU and name from the file (category `Imported`, unit `pcs`, `avgCost` = cost, `price` = cost, `reorderLevel` = 0), then create the adjustment movement into the chosen warehouse.
3. Quantity must be > 0, otherwise `invalid`.

## Preview table (in dialog)
Columns: SKU, Name, Quantity, Cost, Status.
Status chip:
- `New product` (SKU not seen before)
- `Update existing` (SKU matches a product)
- `Invalid` with reason (missing SKU, missing/zero quantity)

Summary chips above the table: New / Existing / Invalid counts.

## Excel template
Downloadable template updated to:

```text
sku            | name                | quantity | cost
SKU-001        | Sample Product A    | 10       | 12.5
SKU-002        | Sample Product B    | 5        | 30
```

Accepted header variants (case-insensitive): `sku`/`SKU`, `name`, `quantity`/`qty`, `cost`/`price`.

## Files to change
- `src/components/app/BulkStockImportDialog.tsx`
  - Add `sku` to the `Row` type; parse it from the sheet.
  - Replace name-based lookup with SKU-based lookup against `products`.
  - Use the uploaded `sku` (not a generated `BULK-…` code) when creating new products; fall back to a generated SKU only if a row is `new` and the SKU somehow ended up blank (shouldn't happen given validation).
  - Update preview table to show SKU column.
  - Update template download to include the `sku` column.

No schema or auth changes. The `/warehouses` page already opens this dialog with the warehouse preselected, so the warehouse-wise workflow is already in place.

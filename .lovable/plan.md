# Plan: Standalone Inventory Management App

Source: [Happy Ledger](/projects/7e6e68f9-c623-40b2-a0ab-a26394fd6711) — its inventory section will be copied here. The Happy Ledger project itself is **not** modified; its inventory module stays intact.

## Scope

Port only the Inventory-related parts of Happy Ledger into this empty TanStack Start project, and reshape the shell so inventory is the entire product (not a sub-section of a bookkeeping app).

### Routes to port
From `src/routes/` in Happy Ledger:
- `products.tsx` → Products catalog
- `stock.tsx` → Stock Control (current stock per warehouse)
- `stock-history.tsx` → Stock movement history
- `warehouses.tsx` → Warehouses
- `suppliers.tsx` → Suppliers (kept — core to inventory/purchasing)
- New `index.tsx` → Inventory Dashboard (stat cards: total products, low stock, warehouses, recent movements)

Not ported: sales, customers, receivables, purchase, payables, income, expense, accounts, transactions, fixed-assets, equity, balance-sheet, profit-loss, invoices.

### Components to port
From `src/components/app/`:
- `AppLayout.tsx` — trimmed to inventory-only nav, rebranded
- `PageHeader.tsx`, `StatCard.tsx`
- `NewProductDialog.tsx`, `NewWarehouseDialog.tsx`, `NewSupplierDialog.tsx`
- `BulkStockImportDialog.tsx`, `TransferStockDialog.tsx`, `TransferDialog.tsx`
- `CompanyProfileCard.tsx` (optional — only if used by inventory pages)

Dropped: Invoice, InvoiceDialog, Customer/Sale/Purchase/Receivable/Payable/Expense/Income/Account/Equity/FixedAsset dialogs.

### Library code to port
- `src/lib/types.ts` — keep only inventory types (Product, Warehouse, Stock, StockMovement, Supplier, Company)
- `src/lib/format.ts`, `src/lib/utils.ts` — full copy
- `src/lib/mock/data.ts` and `store.tsx` — trimmed to inventory entities + company switcher

### Shell changes
- Rebrand sidebar header from "Ledger / Books & Stock" to "Inventory" (e.g. "StockHub" or similar — final name TBD, placeholder "Inventory").
- New sidebar groups:
  - Overview: Dashboard
  - Inventory: Products, Stock Control, Stock History, Warehouses
  - Suppliers: Suppliers
- Root route `__root.tsx` and `styles.css` copied as-is (same design tokens).
- Update root head meta (title, description) to inventory product.

## Technical notes

- Stack already matches (TanStack Start, Tailwind v4, shadcn) — no dependency changes expected beyond what Happy Ledger uses; verify `lucide-react`, `zod`, `react-hook-form`, `sonner`, `date-fns` are present and `bun add` any missing.
- Data layer stays as in-memory mock store (same pattern as source). No Lovable Cloud / DB unless requested later.
- All files copied via `cross_project--read_project_file` then written here; trim imports that referenced removed modules.
- Replace placeholder `src/routes/index.tsx` with the new inventory dashboard.
- Keep design tokens identical so visual parity is preserved.

## Out of scope (ask before adding)
- Authentication, multi-tenant DB, real backend.
- New inventory features not present in Happy Ledger (barcodes, serial tracking, POs workflow, etc.).
- Renaming the product / custom branding beyond a placeholder name.

## Open questions
1. App name — keep "Inventory" placeholder, or pick something like "StockHub" / "InventoryPro"?
2. Include **Suppliers** page? (Recommended yes — useful even without purchasing module.)
3. Keep the multi-company switcher in the header, or single-tenant?

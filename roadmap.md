# Roadmap

- [ ] Add Products PDF export for filtered results with admin-only prices and verify report output

- [x] Match product search keywords anywhere in names and SKUs across pages and stock windows (five matching tests pass)
- [ ] Verify searches against signed-in inventory — blocked because the available preview session does not sign into the external backend

- [x] Bulk Excel stock-in always counts as a purchase (new and existing SKUs, incl. past imports)
- [x] Show cost breakdown on Stock History (units purchased, average, unpriced receipts)
- [x] Classify legacy bulk-import adjustments as purchases without counting normal adjustments
- [x] Use the corrected weighted average in warehouse stock valuation
- [ ] Confirm SKU "-003 far" reads 109.72 in the external production database — blocked by unavailable authenticated external inventory access
- [x] Show full product names with SKUs across pages and product selectors
- [x] Read product names from common Excel header formats during bulk import
- [x] Bulk Excel import can stock multiple warehouses at once (side-by-side warehouse columns, all warehouses matched)
- [x] Combined Stock Out & Transfer window on Stock Control

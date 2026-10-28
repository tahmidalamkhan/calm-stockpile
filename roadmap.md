# Roadmap

- [x] Add multiple manual product lines per AR/AP bill, calculated totals, readable legacy entries and PO payment labels (eight finance tests pass)
- [ ] Verify multi-product accounting save and payment with signed-in access — blocked: preview reaches external-backend sign-in; available managed session belongs to a different backend

- [x] Add Products PDF export for filtered results with admin-only prices (nine tests pass; PDF skill visual QA found no clipping or overlap in admin/staff sample reports)
- [ ] Verify Products PDF download with signed-in inventory — blocked by unavailable external-backend session; browser reaches sign-in screen

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
- [x] Accounts Receivable/Payable with PO-wise payments, discount, VAT/tax, loans; admin dashboard totals
- [x] Accounts tables confirmed present in the external database

# Bulk import into multiple warehouses at once

## Changes (BulkStockImportDialog.tsx)
- Add an optional `Warehouse` column to the Excel file. Each row names its destination warehouse, matched by name or code (case/space/underscore/hyphen-insensitive, same as other headers). Accepted headings: `warehouse`, `warehouse name`, `warehouse code`, `destination`.
- Rows with a Warehouse value go to that warehouse; rows without one fall back to the warehouse picked in the dialog dropdown (keeps today's single-warehouse files working).
- A row naming a warehouse that doesn't exist is marked invalid ("Unknown warehouse") — it is not silently sent to the wrong place.
- The preview table gains a Warehouse column showing each row's destination.
- The downloadable template gains a Warehouse column with example values.
- Import guidance text updated to explain the optional Warehouse column.
- Import still creates one purchase movement per row, now into that row's warehouse.

## Verification
- Parse a test file with mixed warehouse names/codes and blank warehouse cells; confirm the preview shows correct destinations and unknown names are flagged invalid.
- Confirm the app builds without errors.

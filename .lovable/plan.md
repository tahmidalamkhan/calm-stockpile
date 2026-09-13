# Fix product names in bulk import

## Changes
- Normalize Excel header names before reading rows, ignoring capitalization, spaces, underscores, hyphens, and surrounding whitespace.
- Recognize common product-name headings such as `name`, `product name`, and `item name`.
- Keep matching existing products by SKU and show the saved product name when the spreadsheet name is blank.
- Mark a new SKU invalid when its product name is missing instead of creating a product named after its SKU.
- Update the import guidance to list the accepted product-name heading.

## Verification
- Test the parser with `Product Name` and other supported header variants.
- Confirm the preview table displays names and the app builds without errors.

# Project rules

- Store manual finance bill items as a versioned payload in the existing product_name field and use the browser-safe finance helpers to calculate totals and read legacy names; accounting stays independent of inventory without requiring a schema change.
- Use the shared product-search matcher for product lists and selectors so keyword behavior stays consistent across the application.
- Build Products PDF rows through the browser-safe product-report helper and render them with the shared PDF exporter so account-based price visibility is testable without downloading a file.
# Project rules

- Keep AR/AP recipient privacy in a versioned notes payload, enforce it with restrictive database policies on parties and entries, and enable visibility changes only after the external database readiness RPC succeeds; UI filtering alone is not a security boundary.

- Store manual finance bill items (and goods returns, as settlement entries with a return payload) as versioned payloads in the existing product_name field and use the browser-safe finance helpers to calculate totals and read legacy names; accounting stays independent of inventory without requiring a schema change.
- Use the shared product-search matcher for product lists and selectors so keyword behavior stays consistent across the application.
- Build Products PDF rows through the browser-safe product-report helper and render them with the shared PDF exporter so account-based price visibility is testable without downloading a file.
- Build AR/AP documents through browser-safe finance-document helpers using chronological saved ledger order; keep PDF generation client-triggered and authorize recipient visibility before rendering so balances and privacy remain testable without downloads.
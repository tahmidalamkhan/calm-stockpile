# Supabase SQL for this project

Run these files in your Supabase project's **SQL Editor**, in order:

1. **01_schema.sql** — enums, helper functions, all tables, indexes and triggers.
2. **02_rls.sql** — grants and row-level-security policies.

## What gets created

| Table | Purpose |
| --- | --- |
| `companies` | Company records (name, currency, tax id) |
| `warehouses` | Warehouses per company, with default flag |
| `products` | Product catalog (SKU, name, unit, price, avg cost) |
| `suppliers` | Kept for compatibility; unused in the UI |
| `stock_levels` | Current quantity per product per warehouse (never negative) |
| `stock_movements` | Immutable history: purchase / sale / adjustment / transfer with before/after quantities |
| `user_roles` | admin / staff roles, linked to Supabase Auth users |
| `account_requests` | Approval queue for new signups (pending / approved / rejected) |

## Access rules

- Any signed-in user can read, insert and update inventory data.
- Only **admins** can delete rows.
- Users can read their own role and their own approval request; admins can read and manage all of them.

## After running

- Create users under **Authentication → Users** in Supabase, then give the first one the admin role:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<the-user-uuid-from-auth>', 'admin');
```

- New signups land in `account_requests` as `pending` until an admin approves them in the app.

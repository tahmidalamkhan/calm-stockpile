# Database migration to your own PostgreSQL

1. Create an empty database: `createdb inventory`
2. Run the schema: `psql -d inventory -f 01_schema.sql`
3. Load your data: `psql -d inventory -f 02_data.sql`
4. Set passwords (old ones can't be exported):
   `UPDATE app_users SET password_hash = crypt('NewPassword', gen_salt('bf')) WHERE email = 'you@example.com';`

Note: the current app talks to the hosted backend directly (login + data API). Pointing it at a
plain PostgreSQL server also requires a server-side API layer and a new login system.

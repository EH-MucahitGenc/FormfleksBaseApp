# Manual Schema Management

`FormfleksBaseApp` uses manual SQL-based schema management. EF Core is used for mapping/data access only.

## Rules

- Do not use EF migrations as the source of truth for production schema.
- Add every schema change as a versioned SQL script in this folder.
- Keep scripts idempotent where possible.
- Record each applied schema script in `schema_version`.

## Script Naming

- `VYYYYMMDDNN__description.sql`
- Example: `V2026030502__baseline_auth_schema.sql`

---
name: change-storage
description: "Use when changing the database layer, the schema, or the storage backend."
---

# Changing the storage layer

The store talks to one interface, `SqlDatabase`, with two implementations:
`node:sqlite` for a local file and the native `libsql` client for a remote
database. Both are synchronous, which is why the store does not care which one
it has.

| Backend | When | How it is chosen |
|---|---|---|
| `node:sqlite` | Self-host, a VPS, a laptop | The default. A file in `RELAY_DATA_DIR`. |
| `libsql` | Vercel, or anywhere with no disk | `RELAY_DATABASE_URL` is set. Turso in practice. |

## Rules

1. **Only `src/core/` touches the database.** The HTTP layer and the MCP tools
   never see `SqlDatabase`.
2. **Everything is synchronous.** Do not make a store method async. It works
   with both backends only because neither of them is.
3. **Values are normalised before they are bound.** `node:sqlite` accepts only
   `null`, `number`, `bigint`, `string` and `Uint8Array`. Use
   `normaliseValue` for anything else.
4. **Do not use `PRAGMA` in a migration.** It is not available in the same form
   on the remote backend. The migration in `src/core/db.ts` attempts an
   `ALTER TABLE` and swallows the duplicate-column error instead.
5. **Schema changes are additive and idempotent.** A new column is an `ALTER
   TABLE` in `migrate()`, guarded by a try/catch. Never change the shape of an
   existing column without a migration that rewrites the data.
6. **Do not use `SELECT * FROM t LIMIT 0` to discover columns.** It returns no
   rows. Use `PRAGMA main.table_info(t)` — but only in a test, not in a
   migration.
7. **`libsql` is a native module and it is loaded lazily**, with
   `createRequire`, only when `RELAY_DATABASE_URL` is set. A self-hoster who
   never uses a remote database must not need the binary. On Vercel the binary
   has to be traced into the function — that is what `vercel.json`'s
   `includeFiles` is for.
8. **`libsql` adds a `_metadata` property to every row.** The adapter strips
   it. If you add another backend, strip whatever it adds.

## Testing both backends

The remote path is tested with a local libsql file, which is the same code
path as a Turso URL:

```sh
RELAY_DATABASE_URL="file:/tmp/test.db" node dist/cli.js serve
```

A test that only covers the local file does not cover the deployment that
matters most.

## Before you finish

- A test that fails without your change.
- `npm run lint && npm run typecheck && npm test` pass.
- If you changed the schema, a migration that runs on a database created by the
  previous version.

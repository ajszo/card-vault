// Shared Postgres connection (uses the POSTGRES_URL etc. env vars that
// Vercel injects automatically once a Postgres database is attached to the
// project under Storage in the dashboard).
import { sql } from '@vercel/postgres';

let usersTableReady = false;

export async function ensureUsersTable() {
  if (usersTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  usersTableReady = true;
}

export { sql };

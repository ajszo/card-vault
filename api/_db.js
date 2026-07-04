// Shared Postgres connection (uses the POSTGRES_URL etc. env vars that
// Vercel injects automatically once a Postgres database is attached to the
// project under Storage in the dashboard).
import { sql } from '@vercel/postgres';

// DDL statements can't bind parameters, so the default is a literal below
// rather than interpolated - it's a fixed internal constant, not user input.
export const THEMES = ['forest', 'moss', 'slate', 'clay', 'plum'];

let usersTableReady = false;

export async function ensureUsersTable() {
  if (usersTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'forest',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Backfills the column on a users table that already existed before themes shipped.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'forest'`;
  usersTableReady = true;
}

export { sql };

export const config = { runtime: 'nodejs' };

import bcrypt from 'bcryptjs';
import { sql, ensureUsersTable } from '../_db.js';
import { createSessionCookie } from '../_session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { username, passcode } = req.body || {};
  const cleanUsername = (username || '').trim().toLowerCase();

  if (cleanUsername.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters' });
    return;
  }
  if (!passcode || passcode.length < 4) {
    res.status(400).json({ error: 'Passcode must be at least 4 characters' });
    return;
  }

  try {
    await ensureUsersTable();

    const existing = await sql`SELECT id FROM users WHERE username = ${cleanUsername}`;
    if (existing.rows.length) {
      res.status(409).json({ error: 'That username is already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(passcode, 10);
    const inserted = await sql`
      INSERT INTO users (username, password_hash) VALUES (${cleanUsername}, ${passwordHash})
      RETURNING id, username, theme
    `;
    const user = inserted.rows[0];

    res.setHeader('Set-Cookie', createSessionCookie(user));
    res.status(200).json({ user: { id: user.id, username: user.username, theme: user.theme } });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not create account' });
  }
}

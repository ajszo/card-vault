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
  if (!cleanUsername || !passcode) {
    res.status(400).json({ error: 'Username and passcode are required' });
    return;
  }

  try {
    await ensureUsersTable();

    const result = await sql`SELECT id, username, password_hash, theme FROM users WHERE username = ${cleanUsername}`;
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Incorrect username or passcode' });
      return;
    }

    const ok = await bcrypt.compare(passcode, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Incorrect username or passcode' });
      return;
    }

    res.setHeader('Set-Cookie', createSessionCookie(user));
    res.status(200).json({ user: { id: user.id, username: user.username, theme: user.theme } });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not log in' });
  }
}

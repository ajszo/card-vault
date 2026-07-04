export const config = { runtime: 'nodejs' };

import { sql, ensureUsersTable } from '../_db.js';
import { getSessionFromReq } from '../_session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(200).json({ user: null });
    return;
  }

  try {
    await ensureUsersTable();
    const result = await sql`SELECT theme FROM users WHERE id = ${session.userId}`;
    const theme = result.rows[0]?.theme || 'forest';
    res.status(200).json({ user: { id: session.userId, username: session.username, theme } });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load profile' });
  }
}

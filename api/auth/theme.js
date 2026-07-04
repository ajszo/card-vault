export const config = { runtime: 'nodejs' };

import { sql, ensureUsersTable, THEMES } from '../_db.js';
import { getSessionFromReq } from '../_session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }

  const { theme } = req.body || {};
  if (!THEMES.includes(theme)) {
    res.status(400).json({ error: `Theme must be one of: ${THEMES.join(', ')}` });
    return;
  }

  try {
    await ensureUsersTable();
    await sql`UPDATE users SET theme = ${theme} WHERE id = ${session.userId}`;
    res.status(200).json({ theme });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not save theme' });
  }
}

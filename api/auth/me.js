export const config = { runtime: 'nodejs' };

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
  res.status(200).json({ user: { id: session.userId, username: session.username } });
}

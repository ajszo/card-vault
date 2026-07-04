// Talks to the /api/auth/* routes. Session is an httpOnly cookie the
// browser sends automatically - nothing sensitive is kept in JS.
async function parseOrThrow(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export async function signup(username, passcode) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, passcode })
  });
  const data = await parseOrThrow(res);
  return data.user;
}

export async function login(username, passcode) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, passcode })
  });
  const data = await parseOrThrow(res);
  return data.user;
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function fetchCurrentUser() {
  const res = await fetch('/api/auth/me');
  const data = await parseOrThrow(res);
  return data.user;
}

export function setCookie(res, name, value, { maxAgeMs = 2 * 60 * 60 * 1000 } = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const expires = new Date(Date.now() + maxAgeMs).toUTCString();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    isProd ? 'Secure' : null,
    `Expires=${expires}`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`
  ].filter(Boolean);
  res.setHeader('Set-Cookie', parts.join('; '));
}

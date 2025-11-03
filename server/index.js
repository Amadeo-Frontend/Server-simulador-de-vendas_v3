// server/index.js (Render)
app.use((req, res, next) => {
  const allowed = new Set(
    (process.env.FRONTEND_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
  const origin = req.headers.origin;

  if (origin && allowed.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin); // UM valor só
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

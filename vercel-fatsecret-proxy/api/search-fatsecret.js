const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
};

let tokenCache = {
  token: null,
  expiresAt: 0,
};

const getAccessToken = async () => {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FatSecret environment variables are missing.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`FatSecret auth failed: ${response.status} ${body}`);
  }

  const payload = JSON.parse(body);
  tokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max((Number(payload.expires_in) - 300) * 1000, 60_000),
  };

  return tokenCache.token;
};

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  try {
    const { query = '', maxResults = 10 } = parseBody(req);
    const normalizedQuery = String(query).trim();
    const limitedMaxResults = Math.min(Math.max(Number(maxResults) || 10, 1), 20);

    if (normalizedQuery.length < 3) {
      res.status(400).json({ message: 'Query must be at least 3 characters long.' });
      return;
    }

    const token = await getAccessToken();
    const params = new URLSearchParams({
      method: 'foods.search',
      search_expression: normalizedQuery,
      format: 'json',
      max_results: String(limitedMaxResults),
    });

    const response = await fetch(`https://platform.fatsecret.com/rest/server.api?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const body = await response.text();
    if (!response.ok) {
      res.status(502).json({ message: `FatSecret search failed: ${response.status} ${body}` });
      return;
    }

    const payload = JSON.parse(body);
    if (payload.error) {
      res.status(502).json({
        message: payload.error.message || 'FatSecret returned an error.',
        code: payload.error.code,
      });
      return;
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown server error.',
    });
  }
};

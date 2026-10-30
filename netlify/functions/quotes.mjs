const SOURCES = {
  comparapix: {
    url: 'https://api.comparapix.ar/quotes',
    fallbackUrl: 'https://criptoya.com/api/pix',
    headers: {
      Accept: 'application/json',
      Origin: 'https://comparapix.ar',
      Referer: 'https://comparapix.ar/',
      'User-Agent': 'PesoPix-Calculadora/1.0',
    },
    maxAge: 15,
  },
  comparadolar: {
    url: 'https://api.comparadolar.ar/usd',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PesoPix-Calculadora/1.0',
    },
    maxAge: 15,
  },
  usdbrl: {
    url: 'https://economia.awesomeapi.com.br/json/last/USD-BRL,USD-ARS',
    fallbackUrl: 'https://open.er-api.com/v6/latest/USD',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PesoPix-Calculadora/1.0',
    },
    maxAge: 20,
  },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const sourceKey = event.queryStringParameters?.source || 'comparapix';
  const target = SOURCES[sourceKey];

  if (!target) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid source parameter' }),
    };
  }

  try {
    const res = await fetch(target.url, {
      headers: target.headers,
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      throw new Error(`Upstream ${sourceKey} HTTP ${res.status}`);
    }

    const bodyText = await res.text();
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${target.maxAge}, stale-while-revalidate=300`,
        'X-Upstream-Source': sourceKey,
      },
      body: bodyText,
    };
  } catch (primaryErr) {
    if (target.fallbackUrl) {
      try {
        const fbRes = await fetch(target.fallbackUrl, {
          headers: target.headers,
          signal: AbortSignal.timeout(7000),
        });
        if (fbRes.ok) {
          const fbBody = await fbRes.text();
          return {
            statusCode: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=30',
              'X-Upstream-Source': `${sourceKey}-fallback`,
            },
            body: fbBody,
          };
        }
      } catch {
        // Ignore fallback error and return primary 502 below
      }
    }

    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to reach upstream quote service',
        details: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
      }),
    };
  }
};

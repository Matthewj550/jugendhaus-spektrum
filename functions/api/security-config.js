export async function onRequestGet(context) {
  const siteKey = String(context.env.TURNSTILE_SITE_KEY || '').trim();
  return new Response(JSON.stringify({
    siteKey,
    configured: Boolean(siteKey)
  }), {
    status: siteKey ? 200 : 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

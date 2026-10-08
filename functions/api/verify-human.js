const COOKIE_NAME = 'jh_human_verified';
const SESSION_SECONDS = 24 * 60 * 60;

function base64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signSession(secret, expiresAt) {
  const enc = new TextEncoder();
  const derived = await crypto.subtle.digest('SHA-256', enc.encode(`jugendhaus-session:${secret}`));
  const key = await crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(String(expiresAt)));
  return `${expiresAt}.${base64Url(signature)}`;
}

async function verifyTurnstile(secret, token, remoteIp, expectedAction) {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  });
  const result = await response.json();
  return Boolean(result?.success && (!expectedAction || result.action === expectedAction));
}

export async function onRequestPost(context) {
  const secret = String(context.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) {
    return Response.json({ ok: false, message: 'Turnstile Secret Key fehlt in Cloudflare.' }, { status: 503 });
  }

  let token = '';
  try {
    const type = context.request.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const data = await context.request.json();
      token = String(data?.token || '');
    } else {
      const data = await context.request.formData();
      token = String(data.get('token') || data.get('cf-turnstile-response') || '');
    }
  } catch {
    return Response.json({ ok: false, message: 'Ungültige Sicherheitsanfrage.' }, { status: 400 });
  }

  if (!token) return Response.json({ ok: false, message: 'Sicherheitsprüfung fehlt.' }, { status: 400 });

  const remoteIp = context.request.headers.get('CF-Connecting-IP') || '';
  const valid = await verifyTurnstile(secret, token, remoteIp, 'site-entry');
  if (!valid) {
    return Response.json({ ok: false, message: 'Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen.' }, { status: 403 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signed = await signSession(secret, expiresAt);

  return new Response(JSON.stringify({ ok: true, expiresIn: SESSION_SECONDS }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE_NAME}=${signed}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`
    }
  });
}

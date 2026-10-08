const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpqvzkwv';

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestPost(context) {
  const secret = String(context.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) return json({ ok: false, message: 'Der Roboterschutz ist serverseitig noch nicht eingerichtet.' }, 503);

  let formData;
  try {
    formData = await context.request.formData();
  } catch {
    return json({ ok: false, message: 'Das Formular konnte nicht gelesen werden.' }, 400);
  }

  // Honeypot: fake success for simple spambots.
  if (String(formData.get('_gotcha') || formData.get('website') || '').trim()) {
    return json({ ok: true });
  }

  const privacyAccepted = String(formData.get('datenschutz_zugestimmt') || '').trim();
  if (!privacyAccepted) return json({ ok: false, message: 'Bitte bestätige die Datenschutzerklärung.' }, 400);

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const subject = String(formData.get('betreff') || '').trim();
  const message = String(formData.get('nachricht') || '').trim();
  if (!name || name.length > 120) return json({ ok: false, message: 'Bitte gib einen gültigen Namen ein.' }, 400);
  if (!email || email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, 400);
  if (!subject || subject.length > 180) return json({ ok: false, message: 'Bitte wähle einen gültigen Betreff.' }, 400);
  if (message.length < 10 || message.length > 5000) return json({ ok: false, message: 'Die Nachricht muss zwischen 10 und 5000 Zeichen lang sein.' }, 400);

  const token = String(formData.get('turnstile_token') || formData.get('cf-turnstile-response') || '').trim();
  if (!token) return json({ ok: false, message: 'Bitte bestätige die Sicherheitsprüfung.' }, 400);

  const remoteIp = context.request.headers.get('CF-Connecting-IP') || '';
  const valid = await verifyTurnstile(secret, token, remoteIp, 'contact');
  if (!valid) return json({ ok: false, message: 'Die Robotersicherheitsprüfung ist fehlgeschlagen. Bitte erneut bestätigen.' }, 403);

  // Do not forward security-only fields to Formspree; they were already handled here.
  formData.delete('turnstile_token');
  formData.delete('cf-turnstile-response');
  formData.delete('_gotcha');
  formData.delete('website');

  // Keep the existing German fields and additionally provide Formspree's common field names.
  // This makes notification templates/reply handling more predictable without changing the dashboard data users already know.
  formData.set('name', name);
  formData.set('email', email);
  formData.set('subject', subject);
  formData.set('message', message);
  formData.set('_subject', `Neue Anfrage Jugendhaus: ${subject}`.slice(0, 180));
  formData.set('quelle', 'Jugendhaus Spektrum Webseite');

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(result?.errors)
        ? result.errors.map((item) => item?.message).filter(Boolean).join(' ')
        : 'Formspree hat die Nachricht nicht angenommen.';
      return json({ ok: false, message }, response.status || 502);
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, message: 'Formspree ist momentan nicht erreichbar. Bitte versuche es später erneut.' }, 502);
  }
}


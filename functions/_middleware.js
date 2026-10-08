const COOKIE_NAME = 'jh_human_verified';

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifySession(secret, cookieValue) {
  if (!secret || !cookieValue) return false;
  const dot = cookieValue.indexOf('.');
  if (dot < 1) return false;
  const expiresAtRaw = cookieValue.slice(0, dot);
  const signatureRaw = cookieValue.slice(dot + 1);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  try {
    const enc = new TextEncoder();
    const derived = await crypto.subtle.digest('SHA-256', enc.encode(`jugendhaus-session:${secret}`));
    const key = await crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('HMAC', key, fromBase64Url(signatureRaw), enc.encode(expiresAtRaw));
  } catch {
    return false;
  }
}

function isSearchCrawler(request) {
  const ua = request.headers.get('User-Agent') || '';
  return /Googlebot|Google-InspectionTool|Bingbot|DuckDuckBot|Applebot|YandexBot/i.test(ua);
}

function isHtmlNavigation(request) {
  if (request.method !== 'GET') return false;
  const destination = request.headers.get('Sec-Fetch-Dest') || '';
  const accept = request.headers.get('Accept') || '';
  return destination === 'document' || accept.includes('text/html');
}

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  // Cloudflare Pages serves HTML files with "clean URLs" (e.g. verify.html -> /verify).
  // Therefore both variants must bypass the visitor gate, otherwise a redirect loop occurs.
  const publicHtmlPaths = new Set([
    '/verify', '/verify.html',
    '/impressum', '/impressum.html',
    '/datenschutz', '/datenschutz.html',
    '/404', '/404.html',
    '/500', '/500.html',
    '/505', '/505.html'
  ]);

  // Assets, APIs, CMS and legal/security pages must stay reachable without the visitor gate.
  if (!isHtmlNavigation(request)) return context.next();
  if (
    publicHtmlPaths.has(path) ||
    path.startsWith('/api/') ||
    path === '/api' ||
    path.startsWith('/admin/') ||
    path === '/admin'
  ) return context.next();

  // Keep normal search-engine indexing possible. The contact form remains independently protected.
  if (isSearchCrawler(request)) return context.next();

  const secret = String(context.env.TURNSTILE_SECRET_KEY || '').trim();
  const cookie = getCookie(request, COOKIE_NAME);
  if (await verifySession(secret, cookie)) return context.next();

  const returnTo = `${url.pathname}${url.search}`;
  // Use Cloudflare Pages' clean URL directly to avoid .html -> extensionless redirect chains.
  const target = new URL('/verify', url.origin);
  target.searchParams.set('return', returnTo);
  return Response.redirect(target.toString(), 302);
}

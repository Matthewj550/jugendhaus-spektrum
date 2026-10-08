(() => {
  const mount = document.getElementById('entryTurnstile');
  const status = document.getElementById('securityStatus');
  const retry = document.getElementById('securityRetry');
  if (!mount || !status) return;

  let widgetId = null;

  const safeReturnPath = () => {
    const raw = new URLSearchParams(location.search).get('return') || '/';
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
    return raw;
  };

  const setStatus = (message, type = '') => {
    status.className = `security-status${type ? ` ${type}` : ''}`;
    status.textContent = message;
  };

  const waitForTurnstile = (timeoutMs = 10000) => new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.turnstile?.render) {
        clearInterval(timer);
        resolve(window.turnstile);
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Cloudflare Turnstile konnte nicht geladen werden.'));
      }
    }, 80);
  });

  const verifyToken = async (token) => {
    setStatus('Prüfung wird bestätigt …');
    const response = await fetch('/api/verify-human', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.message || 'Sicherheitsprüfung fehlgeschlagen.');
    setStatus('Bestätigt. Webseite wird geöffnet …', 'success');
    window.setTimeout(() => location.replace(safeReturnPath()), 350);
  };

  const start = async () => {
    try {
      const configResponse = await fetch('/api/security-config', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const config = await configResponse.json().catch(() => ({}));
      if (!configResponse.ok || !config?.siteKey) {
        throw new Error('Turnstile ist noch nicht eingerichtet. Bitte Site Key und Secret Key in Cloudflare Pages hinterlegen.');
      }

      const turnstile = await waitForTurnstile();
      mount.innerHTML = '';
      widgetId = turnstile.render(mount, {
        sitekey: config.siteKey,
        theme: 'auto',
        appearance: 'always',
        size: 'flexible',
        action: 'site-entry',
        callback(token) {
          verifyToken(token).catch((error) => {
            console.error(error);
            setStatus(error?.message || 'Prüfung fehlgeschlagen. Bitte erneut versuchen.', 'error');
            if (widgetId !== null && window.turnstile?.reset) window.turnstile.reset(widgetId);
          });
        },
        'expired-callback'() {
          setStatus('Die Prüfung ist abgelaufen. Bitte erneut bestätigen.', 'error');
        },
        'error-callback'() {
          setStatus('Die Sicherheitsprüfung konnte nicht geladen werden. Bitte erneut versuchen.', 'error');
        }
      });
      setStatus('Sicherheitsprüfung bereit.');
    } catch (error) {
      console.error(error);
      setStatus(error?.message || 'Roboterschutz noch nicht eingerichtet.', 'error');
      retry.hidden = false;
    }
  };

  retry?.addEventListener('click', () => {
    retry.hidden = true;
    setStatus('Sicherheitsprüfung wird geladen …');
    if (widgetId !== null && window.turnstile?.remove) {
      try { window.turnstile.remove(widgetId); } catch {}
      widgetId = null;
    }
    start();
  });

  start();
})();

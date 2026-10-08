// Contact form + Cloudflare Turnstile protection.
// Form submissions are sent to our own Cloudflare Pages Function first.
// The Function validates the Turnstile token server-side and only then forwards to Formspree.
(() => {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  const turnstileMount = document.getElementById('contactTurnstile');
  const tokenInput = document.getElementById('contactTurnstileToken');
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form || !turnstileMount || !tokenInput || !submitButton) return;

  let widgetId = null;
  let siteKey = '';

  const setStatus = (message = '', type = '') => {
    if (!status) return;
    status.className = `form-status${type ? ` ${type}` : ''}`;
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
        reject(new Error('Die Sicherheitsprüfung konnte nicht geladen werden.'));
      }
    }, 80);
  });

  const loadSecurityConfig = async () => {
    const response = await fetch('/api/security-config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Der Roboterschutz ist noch nicht vollständig eingerichtet.');
    const config = await response.json();
    if (!config?.siteKey) throw new Error('Der Turnstile Site Key fehlt in Cloudflare.');
    return String(config.siteKey);
  };

  const renderTurnstile = async () => {
    try {
      siteKey = await loadSecurityConfig();
      const turnstile = await waitForTurnstile();
      widgetId = turnstile.render(turnstileMount, {
        sitekey: siteKey,
        theme: 'auto',
        appearance: 'always',
        size: 'flexible',
        action: 'contact',
        callback(token) {
          tokenInput.value = token || '';
          turnstileMount.classList.add('is-verified');
          setStatus('');
        },
        'expired-callback'() {
          tokenInput.value = '';
          turnstileMount.classList.remove('is-verified');
          setStatus('Die Sicherheitsprüfung ist abgelaufen. Bitte bestätige sie erneut.', 'error');
        },
        'error-callback'() {
          tokenInput.value = '';
          turnstileMount.classList.remove('is-verified');
          setStatus('Die Sicherheitsprüfung konnte nicht geladen werden. Bitte versuche es erneut.', 'error');
        }
      });
    } catch (error) {
      console.error('Turnstile konnte nicht initialisiert werden:', error);
      turnstileMount.innerHTML = '<p class="turnstile-setup-error">Roboterschutz noch nicht eingerichtet. Siehe ROBOTERSCHUTZ-EINRICHTEN.txt.</p>';
      setStatus(error?.message || 'Der Roboterschutz ist momentan nicht verfügbar.', 'error');
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (!tokenInput.value) {
      setStatus('Bitte bestätige zuerst die Sicherheitsprüfung „Ich bin kein Roboter“.', 'error');
      turnstileMount.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const originalButton = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = 'Wird geprüft und gesendet …';
    setStatus('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Die Nachricht konnte nicht gesendet werden.');
      }

      form.reset();
      tokenInput.value = '';
      turnstileMount.classList.remove('is-verified');
      if (widgetId !== null && window.turnstile?.reset) window.turnstile.reset(widgetId);
      setStatus('Danke! Deine Nachricht wurde erfolgreich gesendet.', 'success');
    } catch (error) {
      console.error('Kontaktformular fehlgeschlagen:', error);
      setStatus(error?.message || 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.', 'error');
      tokenInput.value = '';
      turnstileMount.classList.remove('is-verified');
      if (widgetId !== null && window.turnstile?.reset) window.turnstile.reset(widgetId);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButton;
    }
  });

  renderTurnstile();
})();

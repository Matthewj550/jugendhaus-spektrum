// Dedicated Formspree handler.
// Kept separate from the animation/audio code so the contact form stays functional
// even if another optional website feature throws an error.
(() => {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;

  const configuredEndpoint = String(window.SPEKTRUM_CONFIG?.formspreeEndpoint || '').trim();
  const htmlEndpoint = String(form.getAttribute('action') || '').trim();
  const endpoint = configuredEndpoint || htmlEndpoint;

  const validEndpoint = (value) => /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/.test(String(value || '').trim());

  // Keep the direct HTML action valid as a no-JavaScript fallback.
  if (validEndpoint(endpoint)) form.action = endpoint;

  form.addEventListener('submit', async (event) => {
    if (!validEndpoint(endpoint)) {
      event.preventDefault();
      if (status) {
        status.className = 'form-status error';
        status.textContent = 'Das Kontaktformular ist momentan nicht verfügbar.';
      }
      return;
    }

    // Browser-native validation first. If JS itself ever fails before this handler,
    // the action/method attributes still submit directly to Formspree.
    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (status) {
      status.className = 'form-status';
      status.textContent = '';
    }

    const button = form.querySelector('button[type="submit"]');
    const originalButton = button?.innerHTML || 'Nachricht senden';
    if (button) {
      button.disabled = true;
      button.textContent = 'Wird gesendet …';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.errors)
          ? data.errors.map((item) => item.message).join(' ')
          : 'Die Nachricht konnte nicht gesendet werden.';
        throw new Error(message);
      }

      form.reset();
      if (status) {
        status.className = 'form-status success';
        status.textContent = 'Danke! Deine Nachricht wurde erfolgreich gesendet.';
      }
    } catch (error) {
      console.error('Formspree-Übertragung fehlgeschlagen:', error);
      if (status) {
        status.className = 'form-status error';
        status.textContent = error?.message || 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = originalButton;
      }
    }
  });
})();

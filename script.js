// Progressive enhancement: the page stays readable even if JavaScript is unavailable.
document.documentElement.classList.add('js');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const root = document.documentElement;
const progressBar = document.getElementById('pageProgressBar');
const pointerGlow = document.getElementById('pointerGlow');
const sceneHud = document.getElementById('sceneHud');
const sceneHudIndex = document.getElementById('sceneHudIndex');
const sceneHudProgress = document.getElementById('sceneHudProgress');
const sceneHudLabel = document.getElementById('sceneHudLabel');
const soundToggle = document.getElementById('soundToggle');
const soundToggleLabel = document.getElementById('soundToggleLabel');
const soundToast = document.getElementById('soundToast');
const backgroundAudio = document.getElementById('backgroundAudio');
const inlineSongAudio = document.getElementById('songAudio');
const musicVideoPlayer = document.getElementById('musicVideo');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setMenu(open) {
  if (!nav || !toggle) return;
  nav.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Navigation schließen' : 'Navigation öffnen');
  document.body.classList.toggle('nav-open', open && window.innerWidth <= 900);
}

toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
document.addEventListener('click', (event) => {
  if (!nav?.classList.contains('open') || !toggle) return;
  if (!nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
});
window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); }, { passive: true });

let revealObserver;
function observeReveals(scope = document) {
  const elements = scope.querySelectorAll('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window) || reducedMotion.matches) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -42px' });
  }
  elements.forEach((el) => revealObserver.observe(el));
}
observeReveals();

const trackedSections = [...document.querySelectorAll('[data-scroll-section]')];
const hero = document.querySelector('.hero');
const hudSections = [hero, ...document.querySelectorAll('[data-section]')].filter(Boolean);
const sceneLabels = new Map([
  [hero, 'START'],
  [document.getElementById('ueber-uns'), 'ÜBER UNS'],
  [document.getElementById('angebote'), 'ANGEBOTE'],
  [document.getElementById('programm'), 'PROGRAMM'],
  [document.querySelector('.story'), 'GESCHICHTE'],
  [document.getElementById('musik'), 'MUSIK'],
  [document.getElementById('besuch'), 'BESUCH'],
  [document.getElementById('kontakt'), 'KONTAKT']
]);
let scrollTicking = false;

// Decorative cinematic chrome is injected by JavaScript only; it never changes CMS content.
trackedSections.forEach((section) => {
  if (section.querySelector(':scope > .scene-chrome')) return;
  const chrome = document.createElement('div');
  chrome.className = 'scene-chrome';
  chrome.setAttribute('aria-hidden', 'true');
  chrome.innerHTML = '<i class="scene-chrome-line line-a"></i><i class="scene-chrome-line line-b"></i><span class="scene-chrome-dot"></span>';
  section.appendChild(chrome);
});

function updateSceneHud(viewport) {
  if (!sceneHud || !hudSections.length) return;
  const focusY = viewport * 0.48;
  let active = hudSections[0];
  let best = Infinity;
  hudSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= viewport) return;
    const centerDistance = Math.abs((rect.top + rect.height / 2) - focusY);
    if (centerDistance < best) { best = centerDistance; active = section; }
  });
  const rect = active.getBoundingClientRect();
  const sectionProgress = clamp((focusY - rect.top) / Math.max(rect.height, 1));
  const rawIndex = active === hero ? '01' : (active?.dataset?.section || '01');
  if (sceneHudIndex) sceneHudIndex.textContent = rawIndex;
  if (sceneHudLabel) sceneHudLabel.textContent = sceneLabels.get(active) || 'SPEKTRUM';
  if (sceneHudProgress) sceneHudProgress.style.transform = `scaleY(${Math.max(.08, sectionProgress).toFixed(3)})`;
  sceneHud.classList.toggle('on-dark', active?.dataset?.theme === 'dark' || active === hero);
}

function updateScrollEffects() {
  scrollTicking = false;
  const y = window.scrollY || window.pageYOffset || 0;
  const viewport = Math.max(window.innerHeight, 1);
  const scrollable = Math.max(document.documentElement.scrollHeight - viewport, 1);
  const pageProgress = clamp(y / scrollable);

  root.style.setProperty('--page-progress', pageProgress.toFixed(4));
  if (progressBar) progressBar.style.transformOrigin = 'left center';
  header?.classList.toggle('scrolled', y > 34);

  if (hero && !reducedMotion.matches) {
    const heroProgress = clamp(y / Math.max(hero.offsetHeight, viewport));
    hero.style.setProperty('--hero-progress', heroProgress.toFixed(4));
    hero.style.setProperty('--hero-shift', `${(y * 0.17).toFixed(1)}px`);
    hero.style.setProperty('--hero-scale', (1 + heroProgress * 0.055).toFixed(4));
    hero.style.setProperty('--hero-title-y', `${(heroProgress * -54).toFixed(1)}px`);
    hero.style.setProperty('--hero-copy-y', `${(heroProgress * -31).toFixed(1)}px`);
    hero.style.setProperty('--hero-title-opacity', (1 - heroProgress * .32).toFixed(3));
    hero.style.setProperty('--hero-copy-opacity', (1 - heroProgress * .5).toFixed(3));
    hero.style.setProperty('--hero-visual-x', `${(heroProgress * 44).toFixed(1)}px`);
    hero.style.setProperty('--hero-visual-rotate', `${(-8 + heroProgress * 15).toFixed(2)}deg`);
    hero.style.setProperty('--hero-mark-scale', (1 - heroProgress * .08).toFixed(4));
    hero.style.setProperty('--hero-ring-rotate', `${(heroProgress * 120).toFixed(1)}deg`);
    hero.style.setProperty('--hero-grid-x', `${(heroProgress * -26).toFixed(1)}px`);
    hero.style.setProperty('--hero-grid-y', `${(heroProgress * 18).toFixed(1)}px`);
    hero.style.setProperty('--hero-grid-scale', (1 + heroProgress * .025).toFixed(4));
    hero.style.setProperty('--hero-beam-rotate', `${(31 + heroProgress * 8).toFixed(2)}deg`);
    hero.style.setProperty('--hero-beam-y', `${(heroProgress * 80).toFixed(1)}px`);
  }

  updateSceneHud(viewport);

  if (!reducedMotion.matches) {
    trackedSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = clamp((viewport * 0.86 - rect.top) / (rect.height + viewport * 0.72));
      section.style.setProperty('--section-progress', progress.toFixed(4));
      const sceneEnter = clamp(progress * 1.42);
      const sceneDepth = (.5 - progress) * 58;
      section.style.setProperty('--scene-enter', sceneEnter.toFixed(4));
      section.style.setProperty('--scene-opacity', (.35 + sceneEnter * .45).toFixed(4));
      section.style.setProperty('--scene-exit', clamp((progress - .64) / .36).toFixed(4));
      section.style.setProperty('--scene-sweep', `${(-18 + progress * 136).toFixed(2)}%`);
      section.style.setProperty('--scene-depth', `${sceneDepth.toFixed(2)}px`);
      section.style.setProperty('--scene-depth-reverse', `${(sceneDepth * -.55).toFixed(2)}px`);
      section.style.setProperty('--scene-bridge-y', `${((1 - sceneEnter) * 26).toFixed(2)}px`);
      section.style.setProperty('--orbit-inner-rotate', `${(progress * -120).toFixed(2)}deg`);
      section.style.setProperty('--orbit-inner-scale', (.92 + progress * .14).toFixed(4));
      section.style.setProperty('--program-tilt', `${((.5 - progress) * 1.7).toFixed(2)}deg`);
      section.style.setProperty('--schedule-line-width', `${(15 + progress * 65).toFixed(2)}%`);
      section.style.setProperty('--story-tilt', `${((.5 - progress) * 1.4).toFixed(2)}deg`);
      section.style.setProperty('--story-num-x', `${(progress * 12).toFixed(2)}px`);
      section.style.setProperty('--story-num-y', `${(progress * -12).toFixed(2)}px`);
      section.style.setProperty('--media-x', `${(progress * 75).toFixed(2)}px`);
      section.style.setProperty('--media-depth', `${(sceneDepth * -.35).toFixed(2)}px`);
      section.style.setProperty('--media-scale', (.92 + progress * .12).toFixed(4));
      section.style.setProperty('--media-sweep', `${(-155 + progress * 250).toFixed(2)}%`);
      section.style.setProperty('--audio-depth', `${(sceneDepth * -.2).toFixed(2)}px`);
      section.style.setProperty('--location-rotate', `${(progress * 25).toFixed(2)}deg`);
      section.style.setProperty('--location-scale', (.94 + progress * .08).toFixed(4));
      section.style.setProperty('--contact-x', `${(progress * 45).toFixed(2)}px`);
      section.style.setProperty('--contact-depth', `${(sceneDepth * -.32).toFixed(2)}px`);
      section.style.setProperty('--contact-rotate', `${(progress * 22).toFixed(2)}deg`);
      section.style.setProperty('--contact-sweep', `${(-80 + progress * 115).toFixed(2)}%`);
      section.style.setProperty('--section-rail-scale', (0.18 + progress * 0.82).toFixed(4));
      section.style.setProperty('--section-line', `${(28 + progress * 65).toFixed(2)}%`);
      section.style.setProperty('--section-clip', `${((1 - progress) * 6).toFixed(2)}%`);
      section.style.setProperty('--image-scale', (1.08 - progress * 0.045).toFixed(4));
      section.style.setProperty('--story-scale', (1.08 - progress * 0.05).toFixed(4));
      section.style.setProperty('--section-y-tiny', `${((0.5 - progress) * 18).toFixed(2)}px`);
      section.style.setProperty('--section-y-small', `${(progress * -18).toFixed(2)}px`);
      section.style.setProperty('--section-y', `${((progress - 0.5) * 90).toFixed(2)}px`);
      section.style.setProperty('--section-y-reverse', `${((0.5 - progress) * 24).toFixed(2)}px`);
      section.style.setProperty('--section-rotate', `${(progress * 90).toFixed(2)}deg`);
      section.style.setProperty('--section-dash', `${((1 - progress) * 180).toFixed(2)}`);
      section.style.setProperty('--story-clip-right', `${(90 + progress * 10).toFixed(2)}%`);
    });
  }
}

function requestScrollEffects() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(updateScrollEffects);
}
updateScrollEffects();
window.addEventListener('scroll', requestScrollEffects, { passive: true });
window.addEventListener('resize', requestScrollEffects, { passive: true });

// Highlight the section currently being viewed.
if ('IntersectionObserver' in window) {
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sectionNavObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible?.target?.id) return;
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${visible.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }, { threshold: [0.2, 0.45, 0.7], rootMargin: '-22% 0px -55% 0px' });
  document.querySelectorAll('main section[id]').forEach((section) => sectionNavObserver.observe(section));
}

// Small pointer light on desktop; decorative only.
if (pointerGlow && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion.matches) {
  window.addEventListener('pointermove', (event) => {
    pointerGlow.style.left = `${event.clientX}px`;
    pointerGlow.style.top = `${event.clientY}px`;
    document.body.classList.add('pointer-active');
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => document.body.classList.remove('pointer-active'));
}

// Gentle 3D response for image/media cards on desktop.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion.matches) {
  document.querySelectorAll('[data-tilt-card]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1100px) rotateX(${(-y * 2.6).toFixed(2)}deg) rotateY(${(x * 3.2).toFixed(2)}deg) translateZ(0)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Site URL and Formspree endpoint remain controlled exclusively by site-config.js.
const cfg = window.SPEKTRUM_CONFIG || {};
if (cfg.siteUrl) {
  const base = String(cfg.siteUrl).replace(/\/$/, '');
  document.getElementById('canonicalUrl')?.setAttribute('href', `${base}/`);
  document.getElementById('ogUrl')?.setAttribute('content', `${base}/`);
  document.getElementById('ogImage')?.setAttribute('content', `${base}/images/social-preview.jpg`);
  document.getElementById('twitterImage')?.setAttribute('content', `${base}/images/social-preview.jpg`);
}

// Consent manager: Google Maps and background music stay off until the visitor decides.
// The choice is persisted redundantly in localStorage + cookie so it survives navigation
// between index.html, Impressum and Datenschutz reliably on the same origin.
const CONSENT_STORAGE_KEY = 'spektrum_consent_v4';
const CONSENT_COOKIE = 'spektrum_consent_v4';
const PREVIOUS_CONSENT_COOKIE = 'spektrum_consent_v3';
const LEGACY_CONSENT_KEY = 'spektrum_consent_v2';
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
const CONSENT_MAX_AGE_MS = CONSENT_MAX_AGE * 1000;
const cookieBanner = document.getElementById('cookieBanner');
const cookieModal = document.getElementById('cookieModal');
const externalMediaConsent = document.getElementById('externalMediaConsent');
const backgroundMusicConsent = document.getElementById('backgroundMusicConsent');
let currentMapQuery = 'Stegwiesenweg 3, 73630 Remshalden';
let musicBlockedByBrowser = false;
let resumeBackgroundAfterMedia = false;
let soundToastTimer = 0;
let backgroundFadeTimer = 0;
let pendingBackgroundSource = '';
let interactionResumeArmed = false;
const BACKGROUND_VOLUME = 0.30;

function readCookie(name) {
  try {
    const prefix = `${name}=`;
    const part = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
    return part ? decodeURIComponent(part.slice(prefix.length)) : null;
  } catch (_) {
    return null;
  }
}

function setConsentCookie(value) {
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  } catch (error) {
    console.warn('Consent-Cookie konnte nicht gespeichert werden.', error);
  }
}

function normalizeConsent(value) {
  if (!value || typeof value !== 'object') return null;
  const parsedSavedAt = Date.parse(value.savedAt || '');
  const savedAtMs = Number.isFinite(parsedSavedAt) ? parsedSavedAt : Date.now();
  if (Date.now() - savedAtMs > CONSENT_MAX_AGE_MS) return null;
  return {
    necessary: true,
    externalMedia: Boolean(value.externalMedia),
    backgroundMusic: Boolean(value.backgroundMusic),
    savedAt: new Date(savedAtMs).toISOString()
  };
}

function persistConsent(value) {
  const normalized = normalizeConsent(value);
  if (!normalized) return null;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Cookie-Einstellungen konnten nicht im Browser-Speicher gesichert werden.', error);
  }
  setConsentCookie(normalized);
  return normalized;
}

function parseConsent(raw) {
  if (!raw) return null;
  try { return normalizeConsent(JSON.parse(raw)); } catch (_) { return null; }
}

function readConsent() {
  // localStorage is the primary store because it stays reliable while navigating
  // between the static HTML pages. The cookie is kept as a fallback/mirror.
  try {
    const rawStored = localStorage.getItem(CONSENT_STORAGE_KEY);
    const stored = parseConsent(rawStored);
    if (stored) return stored;
    if (rawStored) localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch (error) {
    console.warn('Cookie-Einstellungen konnten nicht aus dem Browser-Speicher gelesen werden.', error);
  }

  const currentCookie = parseConsent(readCookie(CONSENT_COOKIE));
  if (currentCookie) {
    persistConsent(currentCookie);
    return currentCookie;
  }

  // Migrate the previous release without asking returning visitors again.
  const previousCookie = parseConsent(readCookie(PREVIOUS_CONSENT_COOKIE));
  if (previousCookie) {
    const migrated = persistConsent(previousCookie);
    return migrated;
  }

  try {
    const legacy = parseConsent(localStorage.getItem(LEGACY_CONSENT_KEY));
    if (legacy) {
      const migrated = persistConsent({
        necessary: true,
        externalMedia: legacy.externalMedia,
        backgroundMusic: false,
        savedAt: new Date().toISOString()
      });
      localStorage.removeItem(LEGACY_CONSENT_KEY);
      return migrated;
    }
  } catch (error) {
    console.warn('Frühere Cookie-Einstellungen konnten nicht migriert werden.', error);
  }
  return null;
}

function showSoundToast(message) {
  if (!soundToast) return;
  window.clearTimeout(soundToastTimer);
  soundToast.textContent = message;
  soundToast.hidden = false;
  requestAnimationFrame(() => soundToast.classList.add('show'));
  soundToastTimer = window.setTimeout(() => {
    soundToast.classList.remove('show');
    window.setTimeout(() => { soundToast.hidden = true; }, 260);
  }, 3200);
}

function sameAssetUrl(a, b) {
  if (!a || !b) return false;
  try { return new URL(a, location.href).href === new URL(b, location.href).href; }
  catch (_) { return String(a) === String(b); }
}

function applyPendingBackgroundSource() {
  if (!backgroundAudio || !pendingBackgroundSource) return;
  const source = document.getElementById('backgroundSongSource');
  if (!source) return;
  if (!sameAssetUrl(source.getAttribute('src'), pendingBackgroundSource)) {
    source.src = pendingBackgroundSource;
    backgroundAudio.load();
  }
  pendingBackgroundSource = '';
}

function queueBackgroundSource(src) {
  if (!backgroundAudio || !src) return;
  const source = document.getElementById('backgroundSongSource');
  if (!source || sameAssetUrl(source.getAttribute('src'), src)) return;
  pendingBackgroundSource = String(src);
  // Never interrupt music that has just been started by the consent click.
  if (backgroundAudio.paused) applyPendingBackgroundSource();
}

function updateSoundControl() {
  if (!soundToggle || !backgroundAudio) return;
  const consent = readConsent();
  const allowed = Boolean(consent?.backgroundMusic);
  const playing = allowed && !backgroundAudio.paused && !backgroundAudio.ended;
  soundToggle.hidden = !consent;
  soundToggle.classList.toggle('is-playing', playing);
  soundToggle.classList.toggle('needs-gesture', allowed && musicBlockedByBrowser && !playing);
  document.body.classList.toggle('music-playing', playing);
  soundToggle.setAttribute('aria-pressed', String(playing));
  soundToggle.setAttribute('aria-label', playing ? 'Hintergrundmusik pausieren' : 'Hintergrundmusik einschalten');
  if (soundToggleLabel) {
    soundToggleLabel.textContent = playing ? 'Musik an' : (allowed && musicBlockedByBrowser ? 'Musik starten' : 'Musik aus');
  }
}

function fadeBackgroundTo(targetVolume, duration = 320, pauseAtEnd = false) {
  if (!backgroundAudio) return;
  window.clearInterval(backgroundFadeTimer);
  const start = Number.isFinite(backgroundAudio.volume) ? backgroundAudio.volume : BACKGROUND_VOLUME;
  const startAt = performance.now();
  backgroundFadeTimer = window.setInterval(() => {
    const elapsed = performance.now() - startAt;
    const t = clamp(elapsed / duration);
    backgroundAudio.volume = start + (targetVolume - start) * t;
    if (t >= 1) {
      window.clearInterval(backgroundFadeTimer);
      if (pauseAtEnd) backgroundAudio.pause();
      updateSoundControl();
    }
  }, 20);
}

function disarmInteractionResume() {
  if (!interactionResumeArmed) return;
  interactionResumeArmed = false;
  document.removeEventListener('pointerdown', resumeOnInteraction, true);
  document.removeEventListener('keydown', resumeOnInteraction, true);
  document.removeEventListener('touchstart', resumeOnInteraction, true);
}

async function resumeOnInteraction(event) {
  // Dedicated controls handle their own click. Avoid starting on pointerdown and then
  // immediately toggling the same control back off on its click event.
  if (event?.target?.closest?.('#soundToggle, #acceptAllCookies, #saveCookieSettings, #rejectCookies, audio, video')) return;
  if (!readConsent()?.backgroundMusic || foregroundMediaIsPlaying()) {
    disarmInteractionResume();
    return;
  }
  const started = await playBackgroundMusic({ fromGesture: true, quiet: true });
  if (started) disarmInteractionResume();
}

function armInteractionResume() {
  if (interactionResumeArmed || !readConsent()?.backgroundMusic) return;
  interactionResumeArmed = true;
  document.addEventListener('pointerdown', resumeOnInteraction, true);
  document.addEventListener('keydown', resumeOnInteraction, true);
  document.addEventListener('touchstart', resumeOnInteraction, true);
}

async function playBackgroundMusic({ fromGesture = false, quiet = false } = {}) {
  if (!backgroundAudio || !readConsent()?.backgroundMusic) return false;
  if (foregroundMediaIsPlaying()) {
    resumeBackgroundAfterMedia = true;
    return false;
  }

  applyPendingBackgroundSource();
  backgroundAudio.loop = true;
  backgroundAudio.volume = Math.min(backgroundAudio.volume || BACKGROUND_VOLUME, BACKGROUND_VOLUME);

  try {
    await backgroundAudio.play();
    musicBlockedByBrowser = false;
    disarmInteractionResume();
    fadeBackgroundTo(BACKGROUND_VOLUME, fromGesture ? 260 : 180);
    updateSoundControl();
    return true;
  } catch (error) {
    musicBlockedByBrowser = true;
    armInteractionResume();
    updateSoundControl();
    if (!quiet) showSoundToast('Musik ist erlaubt. Falls dein Browser Autoplay blockiert, startet sie beim nächsten Tippen oder Klicken.');
    return false;
  }
}

function stopBackgroundMusic({ fade = true } = {}) {
  if (!backgroundAudio) return;
  musicBlockedByBrowser = false;
  disarmInteractionResume();
  if (fade && !backgroundAudio.paused) fadeBackgroundTo(0, 220, true);
  else backgroundAudio.pause();
  updateSoundControl();
}

function pauseBackgroundForMedia() {
  if (!backgroundAudio || backgroundAudio.paused) return;
  resumeBackgroundAfterMedia = Boolean(readConsent()?.backgroundMusic);
  fadeBackgroundTo(0, 180, true);
}

function resumeBackgroundFromMedia() {
  if (!resumeBackgroundAfterMedia) return;
  resumeBackgroundAfterMedia = false;
  playBackgroundMusic({ quiet: true });
}

function applyConsent(value, { fromGesture = false } = {}) {
  if (value.externalMedia) loadGoogleMap(); else resetGoogleMap();
  if (value.backgroundMusic) playBackgroundMusic({ fromGesture, quiet: !fromGesture });
  else stopBackgroundMusic();
  updateSoundControl();
}

function writeConsent(options, { fromGesture = false } = {}) {
  const value = persistConsent({
    necessary: true,
    externalMedia: Boolean(options?.externalMedia),
    backgroundMusic: Boolean(options?.backgroundMusic),
    savedAt: new Date().toISOString()
  });
  if (cookieBanner) cookieBanner.hidden = true;
  if (cookieModal) cookieModal.hidden = true;
  if (value) applyConsent(value, { fromGesture });
  return value;
}

function openSettings() {
  const current = readConsent();
  if (externalMediaConsent) externalMediaConsent.checked = Boolean(current?.externalMedia);
  if (backgroundMusicConsent) backgroundMusicConsent.checked = Boolean(current?.backgroundMusic);
  if (cookieModal) cookieModal.hidden = false;
}

function resetGoogleMap() {
  const frame = document.getElementById('mapFrame');
  if (frame) frame.innerHTML = '';
  const consent = document.getElementById('mapConsent');
  if (consent) consent.style.display = 'grid';
}

function mapUrl() {
  return `https://www.google.com/maps?q=${encodeURIComponent(currentMapQuery)}&output=embed`;
}

function loadGoogleMap() {
  const consent = document.getElementById('mapConsent');
  const frame = document.getElementById('mapFrame');
  if (!frame) return;
  if (consent) consent.style.display = 'none';
  let iframe = frame.querySelector('iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.title = 'Karte Jugendhaus Spektrum';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);
  }
  const wanted = mapUrl();
  if (iframe.src !== wanted) iframe.src = wanted;
}

const storedConsent = readConsent();
if (!storedConsent) {
  if (cookieBanner) cookieBanner.hidden = false;
} else {
  applyConsent(storedConsent, { fromGesture: false });
}
updateSoundControl();

document.getElementById('acceptAllCookies')?.addEventListener('click', () => {
  writeConsent({ externalMedia: true, backgroundMusic: true }, { fromGesture: true });
});
document.getElementById('rejectCookies')?.addEventListener('click', () => {
  writeConsent({ externalMedia: false, backgroundMusic: false }, { fromGesture: true });
});
document.getElementById('openCookieSettings')?.addEventListener('click', openSettings);
document.getElementById('closeCookieSettings')?.addEventListener('click', () => { if (cookieModal) cookieModal.hidden = true; });
document.getElementById('saveCookieSettings')?.addEventListener('click', () => {
  writeConsent({
    externalMedia: Boolean(externalMediaConsent?.checked),
    backgroundMusic: Boolean(backgroundMusicConsent?.checked)
  }, { fromGesture: true });
});
document.querySelectorAll('[data-cookie-settings]').forEach((el) => el.addEventListener('click', openSettings));
document.getElementById('loadMap')?.addEventListener('click', () => {
  const current = readConsent();
  if (current?.externalMedia) loadGoogleMap();
  else {
    openSettings();
    if (externalMediaConsent) externalMediaConsent.checked = true;
  }
});

soundToggle?.addEventListener('click', async () => {
  const current = readConsent() || { externalMedia: false, backgroundMusic: false };
  if (!current.backgroundMusic) {
    writeConsent({ externalMedia: current.externalMedia, backgroundMusic: true }, { fromGesture: true });
    return;
  }
  if (musicBlockedByBrowser || backgroundAudio?.paused) {
    await playBackgroundMusic({ fromGesture: true });
    return;
  }
  writeConsent({ externalMedia: current.externalMedia, backgroundMusic: false }, { fromGesture: true });
});

function foregroundMediaIsPlaying() {
  return Boolean((inlineSongAudio && !inlineSongAudio.paused && !inlineSongAudio.ended) || (musicVideoPlayer && !musicVideoPlayer.paused && !musicVideoPlayer.ended));
}

[inlineSongAudio, musicVideoPlayer].filter(Boolean).forEach((player) => {
  player.addEventListener('play', pauseBackgroundForMedia);
  player.addEventListener('pause', () => window.setTimeout(() => { if (!foregroundMediaIsPlaying()) resumeBackgroundFromMedia(); }, 120));
  player.addEventListener('ended', () => window.setTimeout(() => { if (!foregroundMediaIsPlaying()) resumeBackgroundFromMedia(); }, 120));
});

backgroundAudio?.addEventListener('play', updateSoundControl);
backgroundAudio?.addEventListener('pause', updateSoundControl);
backgroundAudio?.addEventListener('ended', updateSoundControl);
backgroundAudio?.addEventListener('canplay', () => {
  if (readConsent()?.backgroundMusic && backgroundAudio.paused && !musicBlockedByBrowser) {
    playBackgroundMusic({ quiet: true });
  }
});
backgroundAudio?.addEventListener('error', () => {
  updateSoundControl();
  if (readConsent()?.backgroundMusic) showSoundToast('Die Hintergrundmusik konnte nicht geladen werden.');
});

// Do not pause/reload the background track on visibility changes. Reloading it after a
// tab switch can trigger the browser's autoplay protection again. The browser may still
// throttle audio itself when appropriate.

// Contact form is handled independently in form-handler.js so animation/audio errors cannot affect it.

// Sveltia CMS content loader. File paths and JSON structure intentionally remain unchanged.
function cmsText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.textContent = String(value);
}
function cmsSrc(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute('src', String(value));
}
function cmsHref(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute('href', String(value));
}
async function cmsJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
function cmsSafe(value) {
  const el = document.createElement('div');
  el.textContent = String(value ?? '');
  return el.innerHTML;
}

async function loadCmsSite() {
  try {
    const data = await cmsJson('/content/site.json');
    const a = data.allgemein || {};
    const u = data.ueberUns || {};
    const g = data.geschichte || {};
    const k = data.kontakt || {};

    cmsText('heroEyebrow', a.heroEyebrow); cmsText('heroTitle1', a.heroTitel1); cmsText('heroTitle2', a.heroTitel2); cmsText('heroText', a.heroText);
    cmsSrc('siteLogo', a.logo); cmsSrc('introImage', u.bild); cmsText('introEyebrow', u.eyebrow); cmsText('introTitle', u.titel); cmsText('introLead', u.lead); cmsText('introText', u.text);
    const caption = document.getElementById('introCaption');
    if (caption && u.bildtext) caption.innerHTML = `<span>📍</span> ${cmsSafe(u.bildtext)}`;
    cmsSrc('storyImage', g.bild); cmsText('storyEyebrow', g.eyebrow); cmsText('storyTitle', g.titel); cmsText('storyText', g.text); cmsText('storyQuote', g.zitat);
    cmsText('contactTitle', k.titel); cmsText('contactText', k.text); cmsText('contactEmail', k.email); cmsText('contactPhone', k.telefonAnzeige);
    cmsHref('contactEmailLink', k.email ? `mailto:${k.email}` : ''); cmsHref('contactPhoneLink', k.telefonLink ? `tel:${k.telefonLink}` : '');
    cmsHref('instagramLink', k.instagram); cmsText('instagramHandle', k.instagramName);

    const heroVideoSource = document.querySelector('.hero-media source');
    const heroVideo = document.querySelector('.hero-media');
    if (heroVideoSource && a.heroVideo) { heroVideoSource.src = a.heroVideo; heroVideo?.load(); }
    if (heroVideo && a.heroBild) heroVideo.poster = a.heroBild;
  } catch (error) {
    console.error('CMS-Grunddaten konnten nicht geladen werden', error);
  }
}

async function loadCmsOffers() {
  const grid = document.getElementById('offersGrid');
  if (!grid) return;
  try {
    const data = await cmsJson('/content/angebote.json');
    const list = Array.isArray(data.angebote) ? data.angebote : [];
    grid.innerHTML = list.map((item) => `<article class="offer-card reveal"><div class="icon">${cmsSafe(item.icon)}</div><span>${cmsSafe(item.nummer)}</span><h3>${cmsSafe(item.titel)}</h3><p>${cmsSafe(item.text)}</p></article>`).join('');
    observeReveals(grid);
  } catch (error) {
    console.error('CMS-Angebote konnten nicht geladen werden', error);
  }
}

async function loadCmsMedia() {
  try {
    const data = await cmsJson('/content/medien.json');
    const video = data.video || {};
    const song = data.song || {};
    cmsText('mediaEyebrow', data.bereichEyebrow); cmsText('mediaTitle', data.bereichTitel);
    cmsText('videoLabel', video.label); cmsText('videoTitle', video.titel); cmsText('videoText', video.text);
    cmsText('songLabel', song.label); cmsText('songTitle', song.titel); cmsText('songText', song.text); cmsSrc('songCover', song.cover);

    const musicVideo = document.getElementById('musicVideo');
    const musicVideoSource = document.getElementById('musicVideoSource');
    if (musicVideo && video.poster) musicVideo.poster = video.poster;
    if (musicVideoSource && video.datei) { musicVideoSource.src = video.datei; musicVideo?.load(); }

    const songAudio = document.getElementById('songAudio');
    const songSource = document.getElementById('songSource');
    const backgroundSongSource = document.getElementById('backgroundSongSource');
    if (songSource && song.datei && !sameAssetUrl(songSource.getAttribute('src'), song.datei)) {
      songSource.src = song.datei;
      songAudio?.load();
    }
    if (backgroundSongSource && song.datei) queueBackgroundSource(song.datei);
  } catch (error) {
    console.error('CMS-Medien konnten nicht geladen werden', error);
  }
}

async function loadCmsVisit() {
  try {
    const data = await cmsJson('/content/besuch.json');
    const list = Array.isArray(data.oeffnungszeiten) ? data.oeffnungszeiten : [];
    const box = document.getElementById('hoursList');
    if (box) box.innerHTML = list.map((item) => `<div><span><strong>${cmsSafe(item.tag)}</strong><small>${cmsSafe(item.angebot)}</small></span><time>${cmsSafe(item.zeit)}</time></div>`).join('');
    cmsText('hoursNote', data.hinweis); cmsText('locationTitle', data.ortTitel);
    const address = document.getElementById('locationAddress');
    if (address) address.innerHTML = cmsSafe(data.adresse).replace(/\n/g, '<br>');
    currentMapQuery = String(data.mapsSuchtext || currentMapQuery);
    cmsHref('routeLink', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentMapQuery)}`);
    cmsHref('callLink', data.telefonLink ? `tel:${data.telefonLink}` : '');
    if (readConsent()?.externalMedia && document.querySelector('#mapFrame iframe')) loadGoogleMap();
  } catch (error) {
    console.error('CMS-Besuchsdaten konnten nicht geladen werden', error);
  }
}

async function loadWeeklyProgram() {
  const schedule = document.querySelector('#programSchedule');
  const title = document.querySelector('#programTitle');
  const intro = document.querySelector('#programIntro');
  if (!schedule) return;
  try {
    const data = await cmsJson('/content/programm.json');
    if (title && data.ueberschrift) title.textContent = data.ueberschrift;
    if (intro) intro.textContent = data.einleitung || '';
    const items = Array.isArray(data.termine) ? data.termine : [];
    if (!items.length) {
      schedule.innerHTML = '<article><div><small>AKTUELL</small><h3>Momentan sind keine besonderen Termine eingetragen.</h3><p>Die normalen Öffnungszeiten findest du weiter unten.</p></div></article>';
      return;
    }
    schedule.innerHTML = items.map((item) => {
      const date = new Date(`${item.datum}T12:00:00`);
      const day = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { day: '2-digit' }).format(date);
      const month = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date).replace('.', '').toUpperCase();
      return `<article><time datetime="${cmsSafe(item.datum)}"><strong>${cmsSafe(day)}</strong><span>${cmsSafe(month)}</span></time><div><small>${cmsSafe(item.zeit)}</small><h3>${cmsSafe(item.titel)}</h3><p>${cmsSafe(item.beschreibung)}</p></div></article>`;
    }).join('');
  } catch (error) {
    console.error('Wochenprogramm konnte nicht geladen werden', error);
    schedule.innerHTML = '<article><div><small>HINWEIS</small><h3>Das aktuelle Programm konnte nicht geladen werden.</h3><p>Bitte versuche es später erneut.</p></div></article>';
  }
}

async function loadCmsContent() {
  await Promise.allSettled([loadCmsSite(), loadCmsOffers(), loadCmsMedia(), loadCmsVisit(), loadWeeklyProgram()]);
  requestScrollEffects();
}
loadCmsContent();

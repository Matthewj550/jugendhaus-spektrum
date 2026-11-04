(() => {
  const intro = document.getElementById('siteIntro');
  if (!intro) return;

  const SESSION_KEY = 'spektrumIntroSeenV1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch (_) {
    // If storage is unavailable, the intro simply runs normally.
  }

  const removeIntro = () => {
    intro.classList.add('is-leaving');
    document.documentElement.classList.remove('intro-active');
    window.setTimeout(() => intro.remove(), reduceMotion ? 180 : 760);
  };

  if (alreadySeen) {
    intro.remove();
    return;
  }

  document.documentElement.classList.add('intro-active');
  requestAnimationFrame(() => intro.classList.add('is-visible'));

  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch (_) {}

  const displayTime = reduceMotion ? 320 : 1750;
  window.setTimeout(removeIntro, displayTime);

  // Never trap the visitor if a browser pauses animations/timers oddly.
  window.setTimeout(() => {
    if (document.body.contains(intro)) removeIntro();
  }, 4500);
})();

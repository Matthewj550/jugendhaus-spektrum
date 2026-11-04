(() => {
  'use strict';

  const priceImage = document.getElementById('priceImage');
  const pricePlaceholder = document.getElementById('pricePlaceholder');
  if (priceImage && pricePlaceholder) {
    const showPlaceholder = () => {
      priceImage.hidden = true;
      pricePlaceholder.hidden = false;
    };
    priceImage.addEventListener('error', showPlaceholder, { once: true });
    priceImage.addEventListener('load', () => {
      priceImage.hidden = false;
      pricePlaceholder.hidden = true;
    }, { once: true });
    if (priceImage.complete && !priceImage.naturalWidth) showPlaceholder();
  }

  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImage = document.getElementById('galleryLightboxImage');
  const caption = document.getElementById('galleryLightboxCaption');
  const closeBtn = document.getElementById('galleryLightboxClose');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  if (!grid) return;

  const loaded = [];
  let currentIndex = 0;
  let pending = 12;

  const renderEmptyIfNeeded = () => {
    pending -= 1;
    if (pending === 0 && loaded.length === 0 && empty) empty.hidden = false;
  };

  const openLightbox = (index) => {
    if (!lightbox || !lightboxImage || !loaded.length) return;
    currentIndex = (index + loaded.length) % loaded.length;
    const item = loaded[currentIndex];
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    if (caption) caption.textContent = `Galerie · Bild ${String(currentIndex + 1).padStart(2, '0')} von ${String(loaded.length).padStart(2, '0')}`;
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
    closeBtn?.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-open');
  };

  const addGalleryCard = (item, slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-card';
    button.style.setProperty('--delay', `${Math.min(slot * 65, 520)}ms`);
    button.setAttribute('aria-label', `${item.alt} vergrößern`);
    const image = document.createElement('img');
    image.src = item.src;
    image.alt = item.alt;
    image.loading = slot <= 3 ? 'eager' : 'lazy';
    image.decoding = 'async';
    const label = document.createElement('span');
    label.textContent = `SPEKTRUM · ${String(slot).padStart(2, '0')}`;
    const icon = document.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '↗';
    button.append(image, label, icon);
    button.addEventListener('click', () => openLightbox(loaded.indexOf(item)));
    const nextCard = [...grid.querySelectorAll('.gallery-card')].find((card) => Number(card.dataset.slot) > slot);
    button.dataset.slot = String(slot);
    if (nextCard) grid.insertBefore(button, nextCard); else grid.appendChild(button);
  };

  for (let i = 1; i <= 12; i += 1) {
    const number = String(i).padStart(2, '0');
    const src = `images/galerie/galerie-${number}.jpg`;
    const probe = new Image();
    probe.onload = () => {
      const item = { src, alt: `Einblick ins Jugendhaus Spektrum – Bild ${number}`, slot: i };
      loaded.push(item);
      loaded.sort((a, b) => a.slot - b.slot);
      addGalleryCard(item, i);
      if (empty) empty.hidden = true;
      renderEmptyIfNeeded();
    };
    probe.onerror = renderEmptyIfNeeded;
    probe.src = src;
  }

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', () => openLightbox(currentIndex - 1));
  nextBtn?.addEventListener('click', () => openLightbox(currentIndex + 1));
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') openLightbox(currentIndex - 1);
    if (event.key === 'ArrowRight') openLightbox(currentIndex + 1);
  });
})();

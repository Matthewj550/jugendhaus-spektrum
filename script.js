const header=document.querySelector('.site-header');
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.main-nav');
const onScroll=()=>header?.classList.toggle('scrolled',window.scrollY>40);
onScroll();window.addEventListener('scroll',onScroll,{passive:true});
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false')}));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -45px'});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

// Site URL and social metadata are filled from site-config.js.
const cfg=window.SPEKTRUM_CONFIG||{};
if(cfg.siteUrl){const base=String(cfg.siteUrl).replace(/\/$/,'');document.getElementById('canonicalUrl')?.setAttribute('href',base+'/');document.getElementById('ogUrl')?.setAttribute('content',base+'/');document.getElementById('ogImage')?.setAttribute('content',base+'/images/social-preview.jpg');document.getElementById('twitterImage')?.setAttribute('content',base+'/images/social-preview.jpg');}

// Consent manager: Google Maps is never loaded before consent.
const CONSENT_KEY='spektrum_consent_v2';
const cookieBanner=document.getElementById('cookieBanner');
const cookieModal=document.getElementById('cookieModal');
const externalMediaConsent=document.getElementById('externalMediaConsent');
function readConsent(){try{return JSON.parse(localStorage.getItem(CONSENT_KEY)||'null')}catch{return null}}
function writeConsent(externalMedia){const value={necessary:true,externalMedia:Boolean(externalMedia),savedAt:new Date().toISOString()};localStorage.setItem(CONSENT_KEY,JSON.stringify(value));cookieBanner.hidden=true;cookieModal.hidden=true;if(value.externalMedia)loadGoogleMap();else resetGoogleMap();}
function openSettings(){const current=readConsent();externalMediaConsent.checked=Boolean(current?.externalMedia);cookieModal.hidden=false;}
function resetGoogleMap(){const frame=document.getElementById('mapFrame');if(frame)frame.innerHTML='';const consent=document.getElementById('mapConsent');if(consent)consent.style.display='grid';}
function loadGoogleMap(){const consent=document.getElementById('mapConsent');const frame=document.getElementById('mapFrame');if(!frame||frame.querySelector('iframe'))return;if(consent)consent.style.display='none';frame.innerHTML='<iframe title="Karte Jugendhaus Spektrum" src="https://www.google.com/maps?q=Stegwiesenweg%203%2C%2073630%20Remshalden&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';}
const storedConsent=readConsent();if(!storedConsent)cookieBanner.hidden=false;else if(storedConsent.externalMedia)loadGoogleMap();
document.getElementById('acceptAllCookies')?.addEventListener('click',()=>writeConsent(true));
document.getElementById('rejectCookies')?.addEventListener('click',()=>writeConsent(false));
document.getElementById('openCookieSettings')?.addEventListener('click',openSettings);
document.getElementById('closeCookieSettings')?.addEventListener('click',()=>cookieModal.hidden=true);
document.getElementById('saveCookieSettings')?.addEventListener('click',()=>writeConsent(externalMediaConsent.checked));
document.querySelectorAll('[data-cookie-settings]').forEach(el=>el.addEventListener('click',openSettings));
document.getElementById('loadMap')?.addEventListener('click',()=>{const current=readConsent();if(current?.externalMedia)loadGoogleMap();else openSettings();});

// Contact form via Formspree. Only the endpoint in site-config.js must be entered.
const form=document.getElementById('contactForm');
const status=document.getElementById('formStatus');
function validFormspreeEndpoint(value){return /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/.test(String(value||'').trim())&&!String(value).includes('DEINE-ID');}
if(form){const endpoint=String(cfg.formspreeEndpoint||'').trim();if(validFormspreeEndpoint(endpoint))form.action=endpoint;form.addEventListener('submit',async event=>{event.preventDefault();status.className='form-status';status.textContent='';if(!form.reportValidity())return;if(!validFormspreeEndpoint(endpoint)){status.className='form-status error';status.textContent='Das Kontaktformular ist noch nicht freigeschaltet. Bitte trage zuerst den Formspree-Endpunkt in site-config.js ein.';return;}const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Wird gesendet …';try{const response=await fetch(endpoint,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});const data=await response.json().catch(()=>({}));if(!response.ok){const msg=Array.isArray(data.errors)?data.errors.map(e=>e.message).join(' '):'Die Nachricht konnte nicht gesendet werden.';throw new Error(msg);}form.reset();status.className='form-status success';status.textContent='Danke! Deine Nachricht wurde erfolgreich gesendet.';}catch(error){status.className='form-status error';status.textContent=error.message||'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.';}finally{button.disabled=false;button.textContent='Nachricht senden';}});}


// Dynamische Inhalte aus dem kostenlosen CMS (Decap CMS)
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
  const response = await fetch(path, {cache: 'no-store'});
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
    const a=data.allgemein||{}, u=data.ueberUns||{}, g=data.geschichte||{}, k=data.kontakt||{};
    cmsText('heroEyebrow',a.heroEyebrow); cmsText('heroTitle1',a.heroTitel1); cmsText('heroTitle2',a.heroTitel2); cmsText('heroText',a.heroText);
    cmsSrc('siteLogo',a.logo); cmsSrc('introImage',u.bild); cmsText('introEyebrow',u.eyebrow); cmsText('introTitle',u.titel); cmsText('introLead',u.lead); cmsText('introText',u.text);
    const cap=document.getElementById('introCaption'); if(cap&&u.bildtext) cap.innerHTML=`<span>📍</span> ${cmsSafe(u.bildtext)}`;
    cmsSrc('storyImage',g.bild); cmsText('storyEyebrow',g.eyebrow); cmsText('storyTitle',g.titel); cmsText('storyText',g.text); cmsText('storyQuote',g.zitat);
    cmsText('contactTitle',k.titel); cmsText('contactText',k.text); cmsText('contactEmail',k.email); cmsText('contactPhone',k.telefonAnzeige);
    cmsHref('contactEmailLink',k.email?`mailto:${k.email}`:''); cmsHref('contactPhoneLink',k.telefonLink?`tel:${k.telefonLink}`:'');
    cmsHref('instagramLink',k.instagram); cmsText('instagramHandle',k.instagramName);
    const heroVideo=document.querySelector('.hero-media source'); if(heroVideo&&a.heroVideo){heroVideo.src=a.heroVideo;heroVideo.parentElement.load();}
    const hero=document.querySelector('.hero-media'); if(hero&&a.heroBild)hero.poster=a.heroBild;
  } catch(e) { console.error('CMS-Grunddaten konnten nicht geladen werden',e); }
}
async function loadCmsOffers() {
  const grid=document.getElementById('offersGrid'); if(!grid)return;
  try { const data=await cmsJson('/content/angebote.json'); const list=Array.isArray(data.angebote)?data.angebote:[];
    grid.innerHTML=list.map(x=>`<article class="offer-card reveal visible"><div class="icon">${cmsSafe(x.icon)}</div><span>${cmsSafe(x.nummer)}</span><h3>${cmsSafe(x.titel)}</h3><p>${cmsSafe(x.text)}</p></article>`).join('');
  } catch(e) { console.error('CMS-Angebote konnten nicht geladen werden',e); }
}
async function loadCmsMedia() {
  try { const d=await cmsJson('/content/medien.json'),v=d.video||{},s=d.song||{};
    cmsText('mediaEyebrow',d.bereichEyebrow);cmsText('mediaTitle',d.bereichTitel);cmsText('videoLabel',v.label);cmsText('videoTitle',v.titel);cmsText('videoText',v.text);
    cmsText('songLabel',s.label);cmsText('songTitle',s.titel);cmsText('songText',s.text);cmsSrc('songCover',s.cover);
    const mv=document.getElementById('musicVideo'),mvs=document.getElementById('musicVideoSource'); if(mv&&v.poster)mv.poster=v.poster;if(mvs&&v.datei){mvs.src=v.datei;mv?.load();}
    const sa=document.getElementById('songAudio'),ss=document.getElementById('songSource');if(ss&&s.datei){ss.src=s.datei;sa?.load();}
  } catch(e) { console.error('CMS-Medien konnten nicht geladen werden',e); }
}
async function loadCmsVisit() {
  try { const d=await cmsJson('/content/besuch.json'), list=Array.isArray(d.oeffnungszeiten)?d.oeffnungszeiten:[]; const box=document.getElementById('hoursList');
    if(box)box.innerHTML=list.map(x=>`<div><span><strong>${cmsSafe(x.tag)}</strong><small>${cmsSafe(x.angebot)}</small></span><time>${cmsSafe(x.zeit)}</time></div>`).join('');
    cmsText('hoursNote',d.hinweis);cmsText('locationTitle',d.ortTitel);const ad=document.getElementById('locationAddress');if(ad)ad.innerHTML=cmsSafe(d.adresse).replace(/\n/g,'<br>');
    cmsHref('routeLink',`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.mapsSuchtext||'')}`);cmsHref('callLink',d.telefonLink?`tel:${d.telefonLink}`:'');
  } catch(e) { console.error('CMS-Besuchsdaten konnten nicht geladen werden',e); }
}
async function loadWeeklyProgram() {
  const schedule=document.querySelector('#programSchedule'),title=document.querySelector('#programTitle'),intro=document.querySelector('#programIntro');if(!schedule)return;
  try {const data=await cmsJson('/content/programm.json');if(title&&data.ueberschrift)title.textContent=data.ueberschrift;if(intro)intro.textContent=data.einleitung||'';const items=Array.isArray(data.termine)?data.termine:[];
    if(!items.length){schedule.innerHTML='<article><div><small>AKTUELL</small><h3>Momentan sind keine besonderen Termine eingetragen.</h3><p>Die normalen Öffnungszeiten findest du weiter unten.</p></div></article>';return;}
    schedule.innerHTML=items.map(x=>{const date=new Date(`${x.datum}T12:00:00`);const day=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('de-DE',{day:'2-digit'}).format(date);const month=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('de-DE',{month:'short'}).format(date).replace('.','').toUpperCase();return `<article><time datetime="${cmsSafe(x.datum)}"><strong>${cmsSafe(day)}</strong><span>${cmsSafe(month)}</span></time><div><small>${cmsSafe(x.zeit)}</small><h3>${cmsSafe(x.titel)}</h3><p>${cmsSafe(x.beschreibung)}</p></div></article>`}).join('');
  } catch(e){console.error('Wochenprogramm konnte nicht geladen werden',e);schedule.innerHTML='<article><div><small>HINWEIS</small><h3>Das aktuelle Programm konnte nicht geladen werden.</h3><p>Bitte versuche es später erneut.</p></div></article>';}
}
document.addEventListener('DOMContentLoaded',()=>{loadCmsSite();loadCmsOffers();loadCmsMedia();loadCmsVisit();loadWeeklyProgram();});

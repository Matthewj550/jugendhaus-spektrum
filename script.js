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

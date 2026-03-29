import './styles.css';
import { initLidarCanvas } from './lidar-canvas.js';
import { initTwin4dCanvas } from './twin-4d-canvas.js';

const isHomeOnly = import.meta.env.VITE_HOME_ONLY === 'true';
if (isHomeOnly) {
  document.documentElement.classList.add('home-only');
  document.body.classList.remove('nav-drawer-open');
  const dr = document.getElementById('nav-drawer');
  if (dr) {
    dr.setAttribute('hidden', '');
    dr.classList.remove('nav-drawer--open');
  }
  const nt = document.getElementById('nav-toggle');
  if (nt) {
    nt.setAttribute('aria-expanded', 'false');
  }
}

document.documentElement.classList.add('js-ready');
document.body.classList.add('js-ready');

const obs = new IntersectionObserver(
  (es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));

function switchAudience(panel, btn) {
  document.querySelectorAll('.aud-tab').forEach((x) => x.classList.remove('active'));
  document.querySelectorAll('.aud-panel').forEach((x) => x.classList.remove('active'));
  btn.classList.add('active');
  const p = document.getElementById(`aud-${panel}`);
  if (p) p.classList.add('active');
}

function showR(i, b) {
  document.querySelectorAll('.tile').forEach((x) => x.classList.remove('active'));
  document.querySelectorAll('.res-panel').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  const t = document.getElementById(`r${i}`);
  if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
}

window.switchAudience = switchAudience;
window.showR = showR;

const nav = document.querySelector('nav');
const navToggle = document.getElementById('nav-toggle');
const navDrawer = document.getElementById('nav-drawer');
const navDrawerBackdrop = navDrawer?.querySelector('.nav-drawer-backdrop');
const navDrawerClose = navDrawer?.querySelector('.nav-drawer-close');
const navDrawerPanel = navDrawer?.querySelector('.nav-drawer-panel');
let drawerFocusReturn = null;

function getDrawerFocusables() {
  if (!navDrawerPanel) return [];
  return [...navDrawerPanel.querySelectorAll('a[href], button:not([disabled])')];
}

function onDrawerPanelKeydown(e) {
  if (!navDrawer?.classList.contains('nav-drawer--open') || e.key !== 'Tab') return;
  const focusables = getDrawerFocusables();
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function closeNavDrawer() {
  if (!navDrawer || !navToggle) return;
  navDrawer.classList.remove('nav-drawer--open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
  document.body.classList.remove('nav-drawer-open');
  navDrawerPanel?.removeEventListener('keydown', onDrawerPanelKeydown);
  navDrawer.querySelectorAll('.nav-item.has-menu .nav-link-btn').forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
  });
  navDrawer.querySelectorAll('.nav-drawer-item--expanded').forEach((li) =>
    li.classList.remove('nav-drawer-item--expanded'),
  );
  window.setTimeout(() => {
    if (!navDrawer.classList.contains('nav-drawer--open')) navDrawer.setAttribute('hidden', '');
  }, 360);
  const back = drawerFocusReturn;
  drawerFocusReturn = null;
  if (back && typeof back.focus === 'function') {
    window.requestAnimationFrame(() => back.focus());
  } else {
    navToggle?.focus();
  }
}

function openNavDrawer() {
  if (!navDrawer || !navToggle) return;
  drawerFocusReturn = document.activeElement;
  navDrawer.removeAttribute('hidden');
  requestAnimationFrame(() => {
    navDrawer.classList.add('nav-drawer--open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('nav-drawer-open');
    navDrawer.querySelectorAll('.nav-drawer-list .nav-item.has-menu .nav-link-btn').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
    });
    navDrawerPanel?.addEventListener('keydown', onDrawerPanelKeydown);
    window.setTimeout(() => {
      const list = navDrawer.querySelector('.nav-drawer-list');
      const firstCat = list?.querySelector('.nav-item .nav-link-btn');
      if (firstCat) firstCat.focus();
      else navDrawerClose?.focus();
    }, 80);
  });
}

/** ≥ this width: full horizontal nav, no hamburger (typical desktop & laptop, including ~1280px). */
const NAV_FULL_BAR_MIN = 1024;
/** ≤768: all links in drawer; 769–1023: two in bar + hamburger. */
const NAV_TWO_BAR_MAX = 1023;
const NAV_DRAWER_ONLY_MAX = 768;

/** Line icons for drawer category rows (match nav order: Products, Solutions, Resources, Company). */
const DRAWER_CAT_ICONS = [
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h10a2 2 0 012 2v14l-7-3-7 3V5a2 2 0 012-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 8h8M8 12h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
];

function stripDrawerDecoration(li) {
  li.querySelector('.nav-drawer-cat-icon')?.remove();
  li.classList.remove('nav-drawer-item--expanded');
  const btn = li.querySelector('.nav-link-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  delete li.dataset.drawerDecorated;
}

function stripAllDrawerDecorations() {
  document.querySelectorAll('.nav-item[data-drawer-decorated="1"]').forEach(stripDrawerDecoration);
}

function decorateDrawerNavItem(li) {
  const btn = li.querySelector('.nav-link-btn');
  if (!btn || li.dataset.drawerDecorated === '1' || !li.classList.contains('has-menu')) return;
  const order = Math.min(Number(li.dataset.navOrder) || 0, DRAWER_CAT_ICONS.length - 1);
  const wrap = document.createElement('span');
  wrap.className = 'nav-drawer-cat-icon';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = DRAWER_CAT_ICONS[order] ?? DRAWER_CAT_ICONS[0];
  btn.insertBefore(wrap, btn.firstChild);
  li.dataset.drawerDecorated = '1';
}

/** Deep-clone a nav item for the drawer when the same category stays in the top bar (avoids duplicate IDs). */
function cloneNavItemForDrawer(li) {
  const c = li.cloneNode(true);
  c.dataset.navDrawerClone = '1';
  c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  return c;
}

/** Stable references to the primary nav <li> nodes (order preserved). */
let navItemOriginals = [];

function layoutNavItems() {
  if (!nav || navItemOriginals.length === 0) return;
  const primary = nav.querySelector('.nav-links');
  const drawerList = navDrawer?.querySelector('.nav-drawer-list');
  if (!primary || !drawerList) return;

  stripAllDrawerDecorations();

  const n = navItemOriginals.length;
  const w = window.innerWidth;
  let inBar = n;
  if (w <= NAV_DRAWER_ONLY_MAX) inBar = 0;
  else if (w < NAV_FULL_BAR_MIN) inBar = Math.min(2, n);

  for (let i = 0; i < n; i++) {
    primary.appendChild(navItemOriginals[i]);
  }
  drawerList.innerHTML = '';

  if (inBar === n) {
    /* all originals in bar; drawer empty */
  } else if (inBar === 0) {
    for (let i = 0; i < n; i++) {
      drawerList.appendChild(navItemOriginals[i]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (i < inBar) {
        drawerList.appendChild(cloneNavItemForDrawer(navItemOriginals[i]));
      } else {
        drawerList.appendChild(navItemOriginals[i]);
      }
    }
  }

  nav.dataset.barItems = String(inBar);

  drawerList.querySelectorAll('.nav-item.has-menu').forEach(decorateDrawerNavItem);
}

if (nav) {
  const primaryLinks = nav.querySelector('.nav-links');
  if (primaryLinks) {
    [...primaryLinks.querySelectorAll('.nav-item')].forEach((li, i) => {
      li.dataset.navOrder = String(i);
    });
    navItemOriginals = [...primaryLinks.querySelectorAll('.nav-item')].sort(
      (a, b) => Number(a.dataset.navOrder) - Number(b.dataset.navOrder),
    );
  }
  layoutNavItems();

  let resizeNavT;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeNavT);
      resizeNavT = window.setTimeout(() => {
        layoutNavItems();
        if (window.innerWidth >= NAV_FULL_BAR_MIN) closeNavDrawer();
      }, 120);
    },
    { passive: true },
  );

  window.addEventListener(
    'scroll',
    () => {
      nav.style.background = window.scrollY > 20 ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.92)';
      nav.style.boxShadow =
        window.scrollY > 20 ? '0 1px 0 rgba(0,0,0,.06),0 4px 16px rgba(12,8,22,.05)' : 'none';
    },
    { passive: true }
  );

  navToggle?.addEventListener('click', () => {
    if (navDrawer?.classList.contains('nav-drawer--open')) closeNavDrawer();
    else openNavDrawer();
  });
  navDrawerBackdrop?.addEventListener('click', closeNavDrawer);
  navDrawerClose?.addEventListener('click', closeNavDrawer);
  navDrawer?.querySelector('.nav-drawer-footer')?.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) closeNavDrawer();
  });
}

function closeAllMenus() {
  document.querySelectorAll('.nav-item.has-menu.open').forEach((item) => {
    if (item.closest('#nav-drawer')) return;
    item.classList.remove('open');
    const btn = item.querySelector('.nav-link-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item.has-menu > .nav-link-btn');
  if (!btn) return;
  const item = btn.closest('.nav-item.has-menu');
  if (!item) return;
  e.preventDefault();
  if (item.closest('#nav-drawer')) {
    const drawerList = item.closest('.nav-drawer-list');
    const wasExpanded = item.classList.contains('nav-drawer-item--expanded');
    if (drawerList) {
      drawerList.querySelectorAll('.nav-item.has-menu.nav-drawer-item--expanded').forEach((sib) => {
        if (sib !== item) {
          sib.classList.remove('nav-drawer-item--expanded');
          sib.querySelector('.nav-link-btn')?.setAttribute('aria-expanded', 'false');
        }
      });
    }
    item.classList.toggle('nav-drawer-item--expanded', !wasExpanded);
    btn.setAttribute('aria-expanded', !wasExpanded ? 'true' : 'false');
    return;
  }
  if (!item.closest('nav')) return;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.nav-item.has-menu').forEach((i) => {
    if (i.closest('#nav-drawer')) return;
    i.classList.remove('open');
    const b = i.querySelector('.nav-link-btn');
    if (b) b.setAttribute('aria-expanded', 'false');
  });
  if (!wasOpen) {
    item.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-item.has-menu')) closeAllMenus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllMenus();
    closeNavDrawer();
  }
});

const zohoLeadFormSrc = import.meta.env.VITE_ZOHO_LEAD_FORM_URL?.trim();
const leadMount = document.getElementById('lead-form-mount');
if (zohoLeadFormSrc && leadMount) {
  leadMount.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'zoho-lead-iframe';
  iframe.title = 'Request a consultation';
  iframe.setAttribute('loading', 'lazy');
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.src = zohoLeadFormSrc;
  leadMount.appendChild(iframe);
}

const leadForm = document.getElementById('lead-form');
const leadStatus = document.getElementById('lead-status');
const leadEndpoint = import.meta.env.VITE_LEAD_ENDPOINT;

if (leadForm && leadStatus) {
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = leadForm.querySelector('#lead-name')?.value?.trim() ?? '';
    const email = leadForm.querySelector('#lead-email')?.value?.trim() ?? '';
    const company = leadForm.querySelector('#lead-company')?.value?.trim() ?? '';
    const note = leadForm.querySelector('#lead-note')?.value?.trim() ?? '';

    if (!leadEndpoint) {
      leadStatus.textContent =
        'Lead capture is not configured yet. Set VITE_ZOHO_LEAD_FORM_URL (Zoho embed) or VITE_LEAD_ENDPOINT (API).';
      return;
    }

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    leadStatus.textContent = 'Sending…';

    try {
      const res = await fetch(leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, company, note }),
      });
      if (!res.ok) throw new Error(String(res.status));
      leadStatus.textContent = 'Thanks — we will be in touch shortly.';
      leadForm.reset();
    } catch {
      leadStatus.textContent = 'Something went wrong. Please try again or email us directly.';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

initLidarCanvas();
initTwin4dCanvas(document.getElementById('twin-4d-canvas'));

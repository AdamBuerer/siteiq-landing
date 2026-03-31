export function init() {
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

  const FM_PROBLEM_CONTENT = [
    {
      title: 'Energy Intelligence',
      bodyHtml:
        '<p class="res-p">Our AI edge devices connect to your existing HVAC and lighting systems &mdash; no replacement required. Coincident peak demand forecasting reduces peak-hour costs automatically. Smart zone control turns off energy in unoccupied areas without anyone touching a thermostat. Customers average 15&ndash;45% energy cost reduction within 120 days.</p>',
      ctaLabel: 'See energy intelligence',
      ctaHref: '#',
    },
    {
      title: 'Cleaning Operations',
      bodyHtml:
        '<p class="res-p">Most cleaning operations run on fixed schedules with no connection to how spaces are actually being used. SiteIQ changes that. Our 3D digital twin and Spatial Knowledge Graph give you an accurate, real-time model of every space in your facility &mdash; which zones are high-traffic, which are rarely used, how usage patterns shift by day and season. We use that spatial intelligence to simulate and optimize your entire cleaning workload: the right mix of custodians and cleaning robots, assigned to the right areas, at the right times. The result is an optimized schedule built on actual space usage data &mdash; not assumptions. Your staff spend their time where human judgment matters. Robots handle the routine. Costs go down. Standards go up.</p>',
      ctaLabel: 'See cleaning operations',
      ctaHref: '#',
    },
    {
      title: 'Asset Management',
      bodyHtml:
        '<p class="res-p">Most facility teams have a rough idea of what equipment they own &mdash; but no real visibility into where it is right now, how heavily it is being used, or whether it is due for replacement. SiteIQ&rsquo;s IoT monitoring and Spatial Knowledge Graph create a real-time map of every piece of equipment across your facility. You see not just location, but utilization rate, operating condition, and replacement readiness &mdash; so capital and maintenance decisions are based on live data, not spreadsheets.</p>',
      ctaLabel: 'See Asset Management',
      ctaHref: '#',
    },
    {
      title: 'Building Monitoring & Predictive Maintenance',
      bodyHtml:
        '<p class="res-p">Sensor data from HVAC systems, elevators, and critical building systems is continuously analyzed for failure signatures. SiteIQ surfaces warnings 2&ndash;4 weeks before breakdowns occur &mdash; shifting your maintenance team from reactive firefighters to proactive operators. Work orders are generated automatically. Technicians arrive prepared. Emergency repair costs drop significantly.</p>',
      ctaLabel: 'See Building Monitoring and Asset Management',
      ctaHref: '#',
    },
    {
      title: 'Robot Chaos — Unified Fleet Management',
      bodyHtml:
        '<p class="res-p">SiteIQ is hardware-agnostic &mdash; it manages robots from all leading manufacturers in one unified platform. Route optimization, battery management, obstacle avoidance using live occupancy data from the Space Model, and performance analytics across your entire fleet. One screen. Full control. And because every robot feeds data back into the Spatial Knowledge Graph, your cleaning operations and your building intelligence get smarter with every mission.</p>',
      ctaLabel: 'See Cleaning Operations',
      ctaHref: '#',
    },
    {
      title: 'Compliance and Audits',
      bodyHtml:
        '<p class="res-p">When an auditor arrives, you walk in with a live, accurate record &mdash; not a binder assembled under pressure. SiteIQ continuously maps your facility against IFMA, APPA, OSHA, and Joint Commission standards, surfacing gaps as they appear. No manual inspections. No scrambling before a review.</p>',
      ctaLabel: 'See AI Digital Twin',
      ctaHref: '#',
    },
  ];

  const fmDrawer = document.getElementById('fm-problem-drawer');
  const fmDrawerPanel = fmDrawer?.querySelector('.fm-problem-drawer-panel');
  const fmDrawerClose = fmDrawer?.querySelector('.fm-problem-drawer-close');
  const fmDrawerTitle = fmDrawer?.querySelector('#fm-problem-drawer-title');
  const fmDrawerBody = fmDrawer?.querySelector('.fm-problem-drawer-body');
  const fmDrawerCta = fmDrawer?.querySelector('#fm-problem-drawer-cta');
  let fmDrawerFocusReturn = null;

  function getFmDrawerFocusables() {
    if (!fmDrawerPanel) return [];
    return [
      ...fmDrawerPanel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ),
    ].filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
  }

  function onFmDrawerPanelKeydown(e) {
    if (!fmDrawer?.classList.contains('fm-problem-drawer--open') || e.key !== 'Tab') return;
    const focusables = getFmDrawerFocusables();
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

  function onFmDrawerEscape(e) {
    if (e.key !== 'Escape' || !fmDrawer?.classList.contains('fm-problem-drawer--open')) return;
    e.preventDefault();
    closeFmProblemDrawer();
  }

  function closeFmProblemDrawer() {
    if (!fmDrawer) return;
    fmDrawer.classList.remove('fm-problem-drawer--open');
    fmDrawer.setAttribute('hidden', '');
    fmDrawer.setAttribute('aria-hidden', 'true');
    fmDrawerPanel?.removeEventListener('keydown', onFmDrawerPanelKeydown);
    document.removeEventListener('keydown', onFmDrawerEscape);
    const back = fmDrawerFocusReturn;
    fmDrawerFocusReturn = null;
    if (back && typeof back.focus === 'function') {
      window.requestAnimationFrame(() => back.focus());
    }
  }

  function openFmProblemDrawer(index, buttonEl) {
    const data = FM_PROBLEM_CONTENT[index];
    if (!data || !fmDrawer || !fmDrawerTitle || !fmDrawerBody || !fmDrawerCta) return;
    document.querySelectorAll('#aud-fm .tile').forEach((x) => x.classList.remove('active'));
    buttonEl.classList.add('active');
    fmDrawerTitle.textContent = data.title;
    fmDrawerBody.innerHTML = data.bodyHtml;
    fmDrawerCta.href = data.ctaHref;
    fmDrawerCta.innerHTML = `${data.ctaLabel} <span class="arr">&rarr;</span>`;
    fmDrawerFocusReturn = document.activeElement;
    fmDrawer.removeAttribute('hidden');
    fmDrawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      fmDrawer.classList.add('fm-problem-drawer--open');
      fmDrawerPanel?.addEventListener('keydown', onFmDrawerPanelKeydown);
      document.addEventListener('keydown', onFmDrawerEscape);
      window.setTimeout(() => {
        fmDrawerClose?.focus();
        fmDrawer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    });
  }

  fmDrawerClose?.addEventListener('click', () => closeFmProblemDrawer());

  function showR(i, b) {
    openFmProblemDrawer(i, b);
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

  const NAV_FULL_BAR_MIN = 1024;
  const NAV_DRAWER_ONLY_MAX = 768;

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

  function cloneNavItemForDrawer(li) {
    const c = li.cloneNode(true);
    c.dataset.navDrawerClone = '1';
    c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    return c;
  }

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

  const zohoLeadFormSrc = import.meta.env.VITE_ZOHO_LEAD_FORM_URL?.trim();
  const leadMount = document.getElementById('lead-form-mount');
  const leadModalMount = document.getElementById('lead-form-modal-mount');

  function mountZohoLeadIframe(mountEl) {
    if (!mountEl || !zohoLeadFormSrc) return;
    mountEl.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.className = 'zoho-lead-iframe';
    iframe.title = 'Request a consultation';
    iframe.setAttribute('loading', 'lazy');
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src = zohoLeadFormSrc;
    mountEl.appendChild(iframe);
  }

  if (zohoLeadFormSrc) {
    mountZohoLeadIframe(leadMount);
    mountZohoLeadIframe(leadModalMount);
  }

  const leadForm = document.getElementById('lead-form');
  const leadStatus = document.getElementById('lead-status');
  const leadFormModal = document.getElementById('lead-form-modal');
  const leadModalStatus = document.getElementById('lead-modal-status');
  const leadEndpoint = import.meta.env.VITE_LEAD_ENDPOINT;

  function bindLeadForm(formEl, statusEl) {
    if (!formEl || !statusEl) return;
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = formEl.querySelector('[name="name"]')?.value?.trim() ?? '';
      const email = formEl.querySelector('[name="email"]')?.value?.trim() ?? '';
      const company = formEl.querySelector('[name="company"]')?.value?.trim() ?? '';
      let note = formEl.querySelector('[name="note"]')?.value?.trim() ?? '';
      const leadSource = formEl.querySelector('[name="lead_source"]')?.value?.trim() ?? '';
      if (leadSource) {
        note = note ? `${note}\n\n[Source: ${leadSource}]` : `[Source: ${leadSource}]`;
      }

      if (!leadEndpoint) {
        statusEl.textContent =
          'Lead capture is not configured yet. Set VITE_ZOHO_LEAD_FORM_URL (Zoho embed) or VITE_LEAD_ENDPOINT (API).';
        return;
      }

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      statusEl.textContent = 'Sending…';

      try {
        const res = await fetch(leadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, email, company, note }),
        });
        if (!res.ok) throw new Error(String(res.status));
        statusEl.textContent = 'Thanks — we will be in touch shortly.';
        formEl.reset();
      } catch {
        statusEl.textContent = 'Something went wrong. Please try again or email us directly.';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  bindLeadForm(leadForm, leadStatus);
  bindLeadForm(leadFormModal, leadModalStatus);

  const leadModal = document.getElementById('lead-modal');
  const leadModalBackdrop = leadModal?.querySelector('.lead-modal-backdrop');
  const leadModalClose = leadModal?.querySelector('.lead-modal-close');
  const leadModalTitleEl = document.getElementById('lead-modal-title');
  const leadModalNoteEl = document.getElementById('lead-modal-note');
  const leadModalSourceEl = document.getElementById('lead-modal-source');
  const LEAD_MODAL_DEFAULT_TITLE = 'Talk to us';
  const LEAD_MODAL_DEFAULT_PLACEHOLDER =
    'Facility type, goals, timeline, or anything else we should know…';
  let leadModalReturnFocus = null;

  function applyLeadModalContext(opener) {
    const title = opener?.getAttribute('data-lead-modal-title')?.trim();
    const placeholder = opener?.getAttribute('data-lead-modal-placeholder')?.trim();
    const source = opener?.getAttribute('data-lead-source')?.trim();
    if (leadModalTitleEl) leadModalTitleEl.textContent = title || LEAD_MODAL_DEFAULT_TITLE;
    if (leadModalNoteEl) leadModalNoteEl.placeholder = placeholder || LEAD_MODAL_DEFAULT_PLACEHOLDER;
    if (leadModalSourceEl) leadModalSourceEl.value = source || '';
  }

  function resetLeadModalContext() {
    if (leadModalTitleEl) leadModalTitleEl.textContent = LEAD_MODAL_DEFAULT_TITLE;
    if (leadModalNoteEl) leadModalNoteEl.placeholder = LEAD_MODAL_DEFAULT_PLACEHOLDER;
    if (leadModalSourceEl) leadModalSourceEl.value = '';
  }

  function closeLeadModal() {
    if (!leadModal || leadModal.hasAttribute('hidden')) return;
    leadModal.setAttribute('hidden', '');
    leadModal.classList.remove('lead-modal--open');
    document.body.classList.remove('lead-modal-open');
    resetLeadModalContext();
    const back = leadModalReturnFocus;
    leadModalReturnFocus = null;
    if (back && typeof back.focus === 'function') {
      window.requestAnimationFrame(() => back.focus());
    }
  }

  function openLeadModal(opener) {
    if (!leadModal) return;
    closeNavDrawer();
    closeAllMenus();
    leadModalReturnFocus = document.activeElement;
    applyLeadModalContext(opener);
    leadModal.removeAttribute('hidden');
    window.requestAnimationFrame(() => {
      leadModal.classList.add('lead-modal--open');
      document.body.classList.add('lead-modal-open');
      const firstField = leadModal.querySelector('.lead-strip-input');
      if (firstField) firstField.focus();
      else leadModalClose?.focus();
    });
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('.js-open-lead-modal');
    if (!opener) return;
    e.preventDefault();
    openLeadModal(opener);
  });

  leadModalBackdrop?.addEventListener('click', closeLeadModal);
  leadModalClose?.addEventListener('click', closeLeadModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (leadModal && !leadModal.hasAttribute('hidden')) {
        closeLeadModal();
        return;
      }
      closeAllMenus();
      closeNavDrawer();
    }
  });

  const omTabs = document.querySelector('.om-tabs');
  if (omTabs) {
    const tabs = [...omTabs.querySelectorAll('[role="tab"]')];
    const panels = [...omTabs.querySelectorAll('[role="tabpanel"]')];
    const tablist = omTabs.querySelector('[role="tablist"]');

    function activateOmModule(index, { focusTab } = { focusTab: false }) {
      const i = Math.max(0, Math.min(tabs.length - 1, index));
      tabs.forEach((tab, j) => {
        const selected = j === i;
        tab.setAttribute('aria-selected', String(selected));
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('tabindex', selected ? '0' : '-1');
      });
      panels.forEach((panel, j) => {
        if (j === i) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      });
      if (focusTab) {
        const t = tabs[i];
        t?.focus();
        t?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activateOmModule(i));
    });

    tablist?.addEventListener('keydown', (e) => {
      const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      if (cur < 0) return;
      let next = cur;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        next = cur < tabs.length - 1 ? cur + 1 : 0;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        next = cur > 0 ? cur - 1 : tabs.length - 1;
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        next = tabs.length - 1;
      } else {
        return;
      }
      activateOmModule(next, { focusTab: true });
    });
  }
}

import './styles.css';
import { initLidarCanvas } from './lidar-canvas.js';
import { init } from './features.js';
import { initSiteChat } from './siteiq-chat.js';

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

initLidarCanvas();
init();
initSiteChat();

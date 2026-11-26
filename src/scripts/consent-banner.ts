/**
 * Wires the consent banner (ConsentBanner.astro) and the footer "Cookie settings" link to the analytics
 * core (analytics.ts). Without the banner element (no endpoint configured) it does nothing at all.
 * Keyboard: the buttons are real buttons; Escape closes the banner once a choice exists; opening it from
 * the footer moves focus into it and closing returns focus to the link.
 * Layout only: "Details" expands the full text, and while the bar is shown the page gets bottom padding
 * equal to its height (html[data-consent-bar], --consent-h) so the bar never hides the end of the page.
 */
import { createAnalytics, type Analytics } from './analytics';

const box = document.getElementById('aso-consent');
if (box) {
  const endpoint = box.dataset.endpoint ?? '';
  const analytics: Analytics = createAnalytics({ win: window, endpoint });
  const stateEl = box.querySelector<HTMLElement>('[data-consent-state]');
  const closeBtn = box.querySelector<HTMLElement>('[data-consent="close"]');
  const toggleBtn = box.querySelector<HTMLElement>('[data-consent-toggle]');
  const details = box.querySelector<HTMLElement>('.consent-details');
  const root = document.documentElement;
  let opener: HTMLElement | null = null;

  const setDetails = (show: boolean) => {
    if (details) details.hidden = !show;
    toggleBtn?.setAttribute('aria-expanded', String(show));
  };
  const reserve = () => root.style.setProperty('--consent-h', box.hidden ? '0px' : `${Math.ceil(box.getBoundingClientRect().height)}px`);
  const sizer = typeof ResizeObserver === 'function' ? new ResizeObserver(reserve) : null;

  const paint = () => {
    if (stateEl) stateEl.textContent = analytics.choice() === 'granted' ? box.dataset.on ?? '' : analytics.choice() === 'denied' ? box.dataset.off ?? '' : '';
    if (closeBtn) closeBtn.hidden = analytics.choice() === null;
  };
  const open = (focus: boolean) => {
    paint();
    setDetails(false);
    box.hidden = false;
    root.setAttribute('data-consent-bar', '');
    sizer?.observe(box);
    reserve();
    if (focus) box.focus();
  };
  const close = () => {
    box.hidden = true;
    sizer?.disconnect();
    root.removeAttribute('data-consent-bar');
    root.style.removeProperty('--consent-h');
    const back = opener;
    opener = null;
    back?.focus();
  };

  box.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-consent-toggle]')) {
      setDetails(details?.hidden ?? false);
      return;
    }
    const b = (e.target as Element).closest<HTMLElement>('[data-consent]');
    if (!b) return;
    const what = b.dataset.consent;
    if (what === 'accept') analytics.accept();
    else if (what === 'decline') analytics.decline();
    close();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && analytics.choice() !== null) close();
  });
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLElement>('[data-consent-open]');
    if (!link) return;
    e.preventDefault();
    opener = link;
    open(true);
  });

  analytics.start();
  if (analytics.choice() === null) open(false);
}

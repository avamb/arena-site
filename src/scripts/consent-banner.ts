/**
 * Wires the consent banner (ConsentBanner.astro) and the footer "Cookie settings" link to the analytics
 * core (analytics.ts). Without the banner element (no endpoint configured) it does nothing at all.
 * Keyboard: the buttons are real buttons; Escape closes the banner once a choice exists; opening it from
 * the footer moves focus into it and closing returns focus to the link.
 */
import { createAnalytics, type Analytics } from './analytics';

const box = document.getElementById('aso-consent');
if (box) {
  const endpoint = box.dataset.endpoint ?? '';
  const analytics: Analytics = createAnalytics({ win: window, endpoint });
  const stateEl = box.querySelector<HTMLElement>('[data-consent-state]');
  const closeBtn = box.querySelector<HTMLElement>('[data-consent="close"]');
  let opener: HTMLElement | null = null;

  const paint = () => {
    if (stateEl) stateEl.textContent = analytics.choice() === 'granted' ? box.dataset.on ?? '' : analytics.choice() === 'denied' ? box.dataset.off ?? '' : '';
    if (closeBtn) closeBtn.hidden = analytics.choice() === null;
  };
  const open = (focus: boolean) => {
    paint();
    box.hidden = false;
    if (focus) box.focus();
  };
  const close = () => {
    box.hidden = true;
    const back = opener;
    opener = null;
    back?.focus();
  };

  box.addEventListener('click', (e) => {
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

<script lang="ts">
  /**
   * The hero image: a live-looking sales widget (seat map + cart). Rendered on the server so it
   * exists without JS (two seats in row G selected, cart with the total); with JS the plan is
   * interactive: click or press a free seat to add it, the cart recalculates (price per category,
   * service fee, total), seats are held for `holdMinutes` and released when the timer runs out,
   * "Pay" opens a dialog that keeps the visitor on the page. Hovering or focusing a seat shows why
   * it cannot be picked (sold, reserved by another buyer, not for sale) or its category and price.
   * Five price categories by rows, wheelchair spaces at both ends of the back row, about a third of
   * the seats sold. Prices and texts come from home.yaml `widget`.
   * Tokenised with the real widget's variables (--arena-accent, --arena-radius, --arena-bg, --arena-border-color).
   */
  import { onMount } from 'svelte';

  type Link = { label: string; href: string };
  type Widget = {
    aria: string; event: string; meta: string; sessions: string[]; stage: string; mapAria: string; mapText: string;
    seatTitle: string; legend: { sold: string; held: string; wheelchair: string; selected: string };
    currency: string; categories: { name: string; price: number; rows: string }[]; feePercent: number; holdMinutes: number;
    line: string; lineOne: string; qty: string; fee: string; held: string; pay: string; empty: string;
    tips: { free: string; wheelchair: string; selected: string; sold: string; held: string; blocked: string };
    modal: { title: string; text: string; primary: Link; bot: Link; close: string };
  };
  let { w }: { w: Widget } = $props();

  // Seat map: rows A–J, 14 seats, aisle after seat 7.
  const rows = 'ABCDEFGHIJ', cols = 14, sw = 22, sh = 16, gap = 4, aisle = 14, x0 = 22, y0 = 6, VW = 420, VH = 206;
  const has = (m: Record<string, number[]>, r: string, c: number) => !!m[r] && m[r].includes(c);
  const initial = ['G7', 'G8'];
  const wheelchair: Record<string, number[]> = { J: [1, 2, 13, 14] };
  const blocked: Record<string, number[]> = { I: [7, 8] }; // sound desk
  const held: Record<string, number[]> = { C: [7, 8], D: [12], F: [3], H: [10, 11] };
  // About 30% sold, spread over the plan with a fixed pseudo-random sequence (same on server and client).
  const sold: Record<string, number[]> = {};
  let seed = 20261024;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let soldCount = 0;
  while (soldCount < 42) {
    const r = rows[Math.floor(rnd() * rows.length)], c = 1 + Math.floor(rnd() * cols);
    if (initial.includes(r + c) || has(wheelchair, r, c) || has(blocked, r, c) || has(held, r, c) || has(sold, r, c)) continue;
    (sold[r] ??= []).push(c);
    soldCount++;
  }

  const catOf = (r: string) => Math.max(0, w.categories.findIndex((c) => c.rows.includes(r)));
  type Seat = { id: string; row: string; seat: number; x: number; y: number; cat: number; wc: boolean; state: 'free' | 'sold' | 'held' | 'blocked' };
  const seats: { row: string; y: number; seats: Seat[] }[] = [];
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri], y = y0 + ri * (sh + gap);
    const line: Seat[] = [];
    for (let c = 1; c <= cols; c++) {
      const x = x0 + (c - 1) * (sw + gap) + (c > 7 ? aisle : 0);
      const state = has(sold, r, c) ? 'sold' : has(held, r, c) ? 'held' : has(blocked, r, c) ? 'blocked' : 'free';
      line.push({ id: r + c, row: r, seat: c, x, y, cat: catOf(r), wc: has(wheelchair, r, c), state });
    }
    seats.push({ row: r, y, seats: line });
  }
  const byId = new Map(seats.flatMap((l) => l.seats).map((s) => [s.id, s]));

  let selected = $state<string[]>(initial);
  const isSel = (id: string) => selected.includes(id);
  const toggle = (s: Seat) => {
    if (s.state !== 'free') return;
    selected = isSel(s.id) ? selected.filter((id) => id !== s.id) : [...selected, s.id];
    if (tip) showTip(s); // the hint follows the new state (add / remove)
  };

  const money = (n: number) => w.currency + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyShort = (n: number) => w.currency + (Number.isInteger(n) ? String(n) : n.toFixed(2));
  const price = (s: Seat) => w.categories[s.cat].price;
  const fillT = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
  const title = (s: Seat) => fillT(w.seatTitle, { row: s.row, seat: s.seat });

  // Cart, derived from the selection: seats grouped by row, quantity per category, fee, total.
  const picked = $derived(selected.map((id) => byId.get(id)!).sort((a, b) => a.row.localeCompare(b.row) || a.seat - b.seat));
  const lineText = $derived(
    picked.length === 0 ? w.empty : [...new Set(picked.map((s) => s.row))].map((r) => {
      const nums = picked.filter((s) => s.row === r).map((s) => s.seat);
      return nums.length === 1 ? fillT(w.lineOne, { row: r, seat: nums[0] }) : fillT(w.line, { row: r, seats: nums.join(', ') });
    }).join(' · '),
  );
  const cats = $derived(w.categories.map((c, i) => i).filter((i) => picked.some((s) => s.cat === i)));
  const qtyText = $derived(cats.map((i) => fillT(w.qty, { n: picked.filter((s) => s.cat === i).length, price: money(w.categories[i].price) })).join(' + '));
  const categoryText = $derived(cats.map((i) => w.categories[i].name).join(', '));
  const subtotal = $derived(picked.reduce((sum, s) => sum + price(s), 0));
  const feeValue = $derived(Math.round(subtotal * w.feePercent) / 100);
  const total = $derived(subtotal + feeValue);

  // Tooltip: why a seat cannot be picked, or its category and price when it can. Positioned in percent of the map.
  let tip = $state<{ text: string; x: number; y: number } | null>(null);
  const tipText = (s: Seat) => {
    const v = { row: s.row, seat: s.seat, price: money(price(s)), category: w.categories[s.cat].name };
    const key = s.state !== 'free' ? s.state : isSel(s.id) ? 'selected' : s.wc ? 'wheelchair' : 'free';
    return fillT(w.tips[key], v);
  };
  const showTip = (s: Seat) => { tip = { text: tipText(s), x: ((s.x + sw / 2) / VW) * 100, y: (s.y / VH) * 100 }; };
  const hideTip = () => { tip = null; };
  const seatClass = (s: Seat) => 'seat ' + (isSel(s.id) ? 'sel' : s.state === 'free' ? `free c${s.cat + 1}` : s.state);
  const seatLabel = (s: Seat) => `${title(s)}: ${tipText(s)}`;

  // Hold timer: starts with the first seat picked, releases the seats when it runs out.
  const holdSeconds = w.holdMinutes * 60;
  const clock = (s: number) => `${Math.floor(s / 60) < 10 ? '0' : ''}${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;
  let remaining = $state(holdSeconds);
  let deadline: number | null = null;
  $effect(() => {
    if (picked.length === 0) { deadline = null; remaining = holdSeconds; }
    else if (deadline === null) deadline = Date.now() + holdSeconds * 1000;
  });
  onMount(() => {
    const id = setInterval(() => {
      if (deadline === null) return;
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      remaining = left;
      if (left === 0) { selected = []; deadline = null; remaining = holdSeconds; dlg?.open && dlg.close(); }
    }, 1000);
    return () => clearInterval(id);
  });

  // "Pay" opens a dialog instead of leaving the page.
  let dlg = $state<HTMLDialogElement | undefined>();
  const openDialog = () => { if (picked.length) dlg?.showModal(); };
</script>

<div class="widget" role="group" aria-label={w.aria}>
  <div class="w-head">
    <div>
      <div class="w-title">{w.event}</div>
      <div class="w-meta">{w.meta}</div>
    </div>
    <div class="w-chips">
      {#each w.sessions as s, i}<span class="chip" class:on={i === 0}>{s}</span>{/each}
    </div>
  </div>
  <div class="w-map">
    <div class="stage">{w.stage}</div>
    <svg class="seatmap" viewBox="0 0 {VW} {VH}" role="group" aria-label={w.mapAria}>
      {#each seats as line}
        <text x="8" y={line.y + sh - 4} class="rowlbl">{line.row}</text>
        {#each line.seats as st (st.id)}
          <rect
            x={st.x} y={st.y} width={sw} height={sh} rx="4"
            class={seatClass(st)}
            role="button"
            tabindex={st.state === 'free' ? 0 : -1}
            aria-label={seatLabel(st)}
            aria-pressed={st.state === 'free' ? isSel(st.id) : undefined}
            aria-disabled={st.state === 'free' ? undefined : true}
            onclick={() => toggle(st)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(st); } }}
            onmouseenter={() => showTip(st)}
            onmouseleave={hideTip}
            onfocus={() => showTip(st)}
            onblur={hideTip}
          />
          {#if isSel(st.id)}
            <path d="M{st.x + 6} {st.y + 8.5} l3.5 3.5 l6.5 -7" fill="none" stroke="var(--accent-fg)" stroke-width="2" stroke-linecap="round" pointer-events="none"/>
          {:else if st.wc}
            <g class="wc" pointer-events="none" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx={st.x + 10} cy={st.y + 4.2} r="1.5"/>
              <path d="M{st.x + 10} {st.y + 6} v3.2 h3.4 l1.6 2.8 M{st.x + 9.2} {st.y + 8.4} a3.3 3.3 0 1 0 4.4 3.4"/>
            </g>
          {/if}
        {/each}
      {/each}
    </svg>
    {#if tip}<div class="w-tip" style="left:{tip.x}%;top:calc({tip.y}% + 28px)" role="tooltip">{tip.text}</div>{/if}
    <p class="visually-hidden">{w.mapText}</p>
  </div>
  <div class="legend">
    {#each w.categories as c, i}<span><i class="c{i + 1}"></i>{c.name} {moneyShort(c.price)}</span>{/each}
    <span><i class="l-sold"></i>{w.legend.sold}</span>
    <span><i class="l-held"></i>{w.legend.held}</span>
    <span><svg class="l-wc" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="2.6" r="1.4"/><path d="M7 4.4v3.4h3.6l1.8 3.2M6.2 7a3.6 3.6 0 1 0 4.8 3.6"/></svg>{w.legend.wheelchair}</span>
    <span><i class="l-sel"></i>{w.legend.selected}</span>
  </div>
  <div class="w-cart" aria-live="polite">
    <div class="w-left">
      <div class="w-line"><b>{lineText}</b><span class="num">{qtyText}</span></div>
      <div class="w-sub">{categoryText}</div>
      <div class="w-line w-sub"><span>{fillT(w.fee, { percent: w.feePercent })}</span><span class="num">{money(feeValue)}</span></div>
      <div class="w-total">
        <span class="timer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{w.held} <span class="mono">{clock(remaining)}</span></span>
        <span class="sum num">{money(total)}</span>
      </div>
    </div>
    <button class="w-pay" type="button" onclick={openDialog} aria-disabled={picked.length === 0 ? true : undefined}>{picked.length === 0 ? w.empty : fillT(w.pay, { total: money(total) })}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  </div>
  <dialog class="w-dialog" bind:this={dlg} aria-labelledby="w-dialog-title">
    <h3 id="w-dialog-title">{w.modal.title}</h3>
    <p class="w-dialog-sum"><b>{lineText}</b> · {categoryText} · <span class="num">{money(total)}</span></p>
    <p>{fillT(w.modal.text, { total: money(total) })}</p>
    <div class="w-dialog-actions">
      <a class="btn btn-primary" href={w.modal.primary.href}>{w.modal.primary.label}</a>
      <a class="btn btn-ghost" href={w.modal.bot.href}>{w.modal.bot.label}</a>
      <button class="btn btn-ghost" type="button" onclick={() => dlg?.close()}>{w.modal.close}</button>
    </div>
  </dialog>
</div>

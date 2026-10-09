<script lang="ts">
  /**
   * The hero image: a live-looking sales widget (seat map + cart). Rendered on the server so it
   * exists without JS (two seats in row G selected, cart with the total); with JS the plan is
   * interactive: click or press a free seat to add it, the cart recalculates (price per category,
   * service fee, total); hovering or focusing a seat shows why it cannot be picked (sold, reserved
   * by another buyer, not for sale). Prices and texts come from home.yaml `widget`.
   * Tokenised with the real widget's variables (--arena-accent, --arena-radius, --arena-bg, --arena-border-color).
   */
  import { onMount } from 'svelte';

  type Widget = {
    aria: string; event: string; meta: string; sessions: string[]; stage: string; mapAria: string; mapText: string;
    seatTitle: string; legend: { cat1: string; cat2: string; sold: string; held: string; selected: string };
    currency: string; prices: { cat1: number; cat2: number }; categories: { cat1: string; cat2: string }; feePercent: number;
    line: string; lineOne: string; qty: string; fee: string; held: string; heldFor: string; pay: string; empty: string;
    tips: { free: string; selected: string; sold: string; held: string; blocked: string };
  };
  let { w }: { w: Widget } = $props();

  // Seat map: rows A–J, 14 seats, aisle after seat 7. Deterministic states, same as the prototype.
  const rows = 'ABCDEFGHIJ', cols = 14, sw = 22, sh = 16, gap = 4, aisle = 14, x0 = 22, y0 = 6, VW = 420, VH = 206;
  const all = Array.from({ length: 14 }, (_, i) => i + 1);
  const sold: Record<string, number[]> = { A: all, B: all, C: all, D: all.slice(0, 12), E: all.slice(0, 11), F: all.slice(0, 10), G: [1, 2, 3, 4, 5, 6, 9, 10, 11], H: [1, 2, 3], I: [1, 2], J: [1] };
  const held: Record<string, number[]> = { G: [12, 13], H: [6, 7], I: [8, 9] };
  // Not for sale: the sound desk takes the last seats of the back rows.
  const blocked: Record<string, number[]> = { I: [14], J: [13, 14] };
  const has = (m: Record<string, number[]>, r: string, c: number) => !!m[r] && m[r].includes(c);

  type Seat = { id: string; row: string; seat: number; x: number; y: number; cat: 'cat1' | 'cat2'; state: 'free' | 'sold' | 'held' | 'blocked' };
  const seats: { row: string; y: number; seats: Seat[] }[] = [];
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri], y = y0 + ri * (sh + gap);
    const line: Seat[] = [];
    for (let c = 1; c <= cols; c++) {
      const x = x0 + (c - 1) * (sw + gap) + (c > 7 ? aisle : 0);
      const state = has(sold, r, c) ? 'sold' : has(held, r, c) ? 'held' : has(blocked, r, c) ? 'blocked' : 'free';
      line.push({ id: r + c, row: r, seat: c, x, y, cat: ri < 7 ? 'cat1' : 'cat2', state });
    }
    seats.push({ row: r, y, seats: line });
  }
  const byId = new Map(seats.flatMap((l) => l.seats).map((s) => [s.id, s]));

  let selected = $state<string[]>(['G7', 'G8']);
  const isSel = (id: string) => selected.includes(id);
  const toggle = (s: Seat) => {
    if (s.state !== 'free') return;
    selected = isSel(s.id) ? selected.filter((id) => id !== s.id) : [...selected, s.id];
    if (tip) showTip(s); // the hint follows the new state (add / remove)
  };

  const money = (n: number) => w.currency + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const price = (s: Seat) => w.prices[s.cat];
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
  const qtyText = $derived((['cat1', 'cat2'] as const).filter((c) => picked.some((s) => s.cat === c)).map((c) => fillT(w.qty, { n: picked.filter((s) => s.cat === c).length, price: money(w.prices[c]) })).join(' + '));
  const categoryText = $derived((['cat1', 'cat2'] as const).filter((c) => picked.some((s) => s.cat === c)).map((c) => w.categories[c]).join(', '));
  const subtotal = $derived(picked.reduce((sum, s) => sum + price(s), 0));
  const feeValue = $derived(Math.round(subtotal * w.feePercent) / 100);
  const total = $derived(subtotal + feeValue);

  // Tooltip: why a seat cannot be picked, or its price when it can. Positioned in percent of the map.
  let tip = $state<{ text: string; x: number; y: number } | null>(null);
  const tipText = (s: Seat) => {
    const v = { row: s.row, seat: s.seat, price: money(price(s)), category: w.categories[s.cat] };
    return fillT(s.state === 'free' ? (isSel(s.id) ? w.tips.selected : w.tips.free) : w.tips[s.state], v);
  };
  const showTip = (s: Seat) => { tip = { text: tipText(s), x: ((s.x + sw / 2) / VW) * 100, y: (s.y / VH) * 100 }; };
  const hideTip = () => { tip = null; };
  const seatClass = (s: Seat) => 'seat ' + (isSel(s.id) ? 'sel' : s.state === 'free' ? (s.cat === 'cat1' ? 'av' : 'av2') : s.state);
  const seatLabel = (s: Seat) => `${title(s)}: ${tipText(s)}`;

  let timer = $state(w.heldFor);
  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [m0, s0] = w.heldFor.split(':').map(Number);
    let s = m0 * 60 + s0;
    const id = setInterval(() => {
      s = s > 0 ? s - 1 : m0 * 60 + s0;
      const m = Math.floor(s / 60), x = s % 60;
      timer = `${m < 10 ? '0' : ''}${m}:${x < 10 ? '0' : ''}${x}`;
    }, 1000);
    return () => clearInterval(id);
  });
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
          {#if isSel(st.id)}<path d="M{st.x + 6} {st.y + 8.5} l3.5 3.5 l6.5 -7" fill="none" stroke="var(--accent-fg)" stroke-width="2" stroke-linecap="round" pointer-events="none"/>{/if}
        {/each}
      {/each}
    </svg>
    {#if tip}<div class="w-tip" style="left:{tip.x}%;top:calc({tip.y}% + 28px)" role="tooltip">{tip.text}</div>{/if}
    <p class="visually-hidden">{w.mapText}</p>
  </div>
  <div class="legend">
    <span><i class="l1"></i>{w.legend.cat1}</span><span><i class="l2"></i>{w.legend.cat2}</span><span><i class="l3"></i>{w.legend.sold}</span><span><i class="l5"></i>{w.legend.held}</span><span><i class="l4"></i>{w.legend.selected}</span>
  </div>
  <div class="w-cart" aria-live="polite">
    <div class="w-left">
      <div class="w-line"><b>{lineText}</b><span class="num">{qtyText}</span></div>
      <div class="w-sub">{categoryText}</div>
      <div class="w-line w-sub"><span>{fillT(w.fee, { percent: w.feePercent })}</span><span class="num">{money(feeValue)}</span></div>
      <div class="w-total">
        <span class="timer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{w.held} <span class="mono">{timer}</span></span>
        <span class="sum num">{money(total)}</span>
      </div>
    </div>
    <a class="w-pay" href="/start" aria-disabled={picked.length === 0 ? true : undefined}>{picked.length === 0 ? w.empty : fillT(w.pay, { total: money(total) })}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>
  </div>
</div>

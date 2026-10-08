<script lang="ts">
  /**
   * The hero image: a live-looking sales widget (seat map + cart). Rendered on the server so it
   * exists without JS; the only client behaviour is the countdown, off under reduced motion.
   * Tokenised with the real widget's variables (--arena-accent, --arena-radius, --arena-bg, --arena-border-color).
   */
  import { onMount } from 'svelte';

  type Widget = {
    aria: string; event: string; meta: string; sessions: string[]; stage: string; mapAria: string; mapText: string;
    seatTitle: string; legend: { cat1: string; cat2: string; sold: string; selected: string };
    line: string; qty: string; category: string; fee: string; feeValue: string; held: string; heldFor: string; total: string; pay: string;
  };
  let { w }: { w: Widget } = $props();

  // Seat map: rows A–J, 14 seats, aisle after seat 7. Deterministic states, same as the prototype.
  const rows = 'ABCDEFGHIJ', cols = 14, sw = 22, sh = 16, gap = 4, aisle = 14, x0 = 22, y0 = 6;
  const all = Array.from({ length: 14 }, (_, i) => i + 1);
  const sold: Record<string, number[]> = { A: all, B: all, C: all, D: all.slice(0, 12), E: all.slice(0, 11), F: all.slice(0, 10), G: [1, 2, 3, 4, 5, 6, 9, 10, 11], H: [1, 2, 3], I: [1, 2], J: [1] };
  const held: Record<string, number[]> = { G: [12, 13], H: [6, 7], I: [8, 9] };
  const sel: Record<string, number[]> = { G: [7, 8] };
  const has = (m: Record<string, number[]>, r: string, c: number) => !!m[r] && m[r].includes(c);

  type Seat = { x: number; y: number; cls: string; title: string; selected: boolean };
  const seats: { row: string; y: number; seats: Seat[] }[] = [];
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri], y = y0 + ri * (sh + gap);
    const line: Seat[] = [];
    for (let c = 1; c <= cols; c++) {
      const x = x0 + (c - 1) * (sw + gap) + (c > 7 ? aisle : 0);
      const selected = has(sel, r, c);
      const cls = 'seat ' + (selected ? 'sel' : has(sold, r, c) ? 'sold' : has(held, r, c) ? 'held' : ri < 7 ? 'av' : 'av2');
      line.push({ x, y, cls, selected, title: w.seatTitle.replace('{row}', r).replace('{seat}', String(c)) });
    }
    seats.push({ row: r, y, seats: line });
  }

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
    <svg class="seatmap" viewBox="0 0 420 206" role="img" aria-label={w.mapAria}>
      {#each seats as line}
        <text x="8" y={line.y + sh - 4} class="rowlbl">{line.row}</text>
        {#each line.seats as st}
          <rect x={st.x} y={st.y} width={sw} height={sh} rx="4" class={st.cls}><title>{st.title}</title></rect>
          {#if st.selected}<path d="M{st.x + 6} {st.y + 8.5} l3.5 3.5 l6.5 -7" fill="none" stroke="var(--accent-fg)" stroke-width="2" stroke-linecap="round"/>{/if}
        {/each}
      {/each}
    </svg>
    <p class="visually-hidden">{w.mapText}</p>
  </div>
  <div class="legend">
    <span><i class="l1"></i>{w.legend.cat1}</span><span><i class="l2"></i>{w.legend.cat2}</span><span><i class="l3"></i>{w.legend.sold}</span><span><i class="l4"></i>{w.legend.selected}</span>
  </div>
  <div class="w-cart">
    <div class="w-left">
      <div class="w-line"><b>{w.line}</b><span class="num">{w.qty}</span></div>
      <div class="w-sub">{w.category}</div>
      <div class="w-line w-sub"><span>{w.fee}</span><span class="num">{w.feeValue}</span></div>
      <div class="w-total">
        <span class="timer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{w.held} <span class="mono">{timer}</span></span>
        <span class="sum num">{w.total}</span>
      </div>
    </div>
    <button class="w-pay" type="button">{w.pay}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  </div>
</div>

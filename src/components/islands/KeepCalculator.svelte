<script lang="ts">
  /**
   * "How much stays with you" (home, money block). Ticket revenue plus the organizer's own fee to buyers
   * (all of it is theirs) minus the ArenaSoldOut.com commission per ticket, from content/data via props.
   * One currency switch: it follows and sets the pricing block's switch (#pc-usd / #pc-eur).
   */
  import { standardFee, lowPriceFee, isLowPriceEvent, round2, type LowPrice } from '../../lib/fees';
  type Rate = { id: string; code: string; symbol: string; perTicket: number; seatingExtra: number; lowPrice: LowPrice };
  type Labels = { title: string; currency: string; tickets: string; price: string; fee: string; seated: string; revenue: string; feeLine: string; commission: string; total: string; note: string };
  let { labels, rates, intl }: { labels: Labels; rates: Rate[]; intl: string } = $props();

  let code = $state(rates[0].code);
  let qty = $state(300);
  let price = $state(25);
  let fee = $state(1);
  let seated = $state(false);

  const rate = $derived(rates.find((r) => r.code === code) ?? rates[0]);
  const num = (v: unknown) => Math.max(0, Number(v) || 0);
  const fmt = (n: number) => rate.symbol + Math.round(n).toLocaleString(intl);
  const out = $derived.by(() => {
    const q = Math.floor(num(qty)), p = num(price), f = num(fee);
    const per = isLowPriceEvent(p, rate.lowPrice) ? lowPriceFee(p, rate.lowPrice, seated) : standardFee(rate.perTicket, rate.seatingExtra, seated);
    const revenue = q * p, own = q * f, commission = round2(q * per);
    return { revenue, own, commission, total: revenue + own - commission };
  });

  /* Keep in step with the pricing block's switch, both ways. */
  $effect(() => {
    const radio = document.getElementById(`pc-${code.toLowerCase()}`) as HTMLInputElement | null;
    if (radio && !radio.checked) radio.checked = true;
  });
  $effect(() => {
    const radios = rates.map((r) => document.getElementById(`pc-${r.code.toLowerCase()}`)).filter(Boolean) as HTMLInputElement[];
    const on = () => { const r = radios.find((x) => x.checked); if (r) code = r.id.slice(3).toUpperCase(); };
    radios.forEach((r) => r.addEventListener('change', on));
    return () => radios.forEach((r) => r.removeEventListener('change', on));
  });
</script>

<div class="card calc keep">
  <div class="keep-head">
    <b>{labels.title}</b>
    <span class="keep-cur" role="group" aria-label={labels.currency}>
      {#each rates as r}<button type="button" aria-pressed={code === r.code} onclick={() => (code = r.code)}>{r.symbol} {r.code}</button>{/each}
    </span>
  </div>
  <div class="keep-grid">
    <div class="keep-in">
      <label>{labels.tickets}<input type="number" min="0" step="10" bind:value={qty} /></label>
      <label>{labels.price} ({rate.symbol})<input type="number" min="0" step="1" bind:value={price} /></label>
      <label>{labels.fee} ({rate.symbol})<input type="number" min="0" step="0.5" bind:value={fee} /></label>
      <label class="chk"><input type="checkbox" bind:checked={seated} /> {labels.seated}</label>
    </div>
    <dl class="keep-out" aria-live="polite">
      <div><dt>{labels.revenue}</dt><dd>{fmt(out.revenue)}</dd></div>
      <div><dt>{labels.feeLine}</dt><dd>+ {fmt(out.own)}</dd></div>
      <div><dt>{labels.commission}</dt><dd>− {fmt(out.commission)}</dd></div>
      <div class="keep-total"><dt>{labels.total}</dt><dd>{fmt(out.total)}</dd></div>
    </dl>
  </div>
  <p class="pr-note">{labels.note}</p>
</div>

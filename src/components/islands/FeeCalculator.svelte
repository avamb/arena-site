<script lang="ts">
  /**
   * Fee calculator. One ticket category at a time: its price, the highest price of any ticket of the
   * event (decides the tariff), quantity, seat or not, region (currency only; the numbers are equal).
   * Numbers come from content/data via props; the arithmetic lives in $lib/fees.
   */
  import { standardFee, lowPriceFee, isLowPriceEvent, packageFor, packageFee, round2, type LowPrice, type Package } from '../../lib/fees';
  type Region = { id: string; label: string; symbol: string; perTicket: number; seatingExtra: number };
  type Labels = {
    aria: string; region: string; price: string; maxPrice: string; quantity: string; seating: string; result: string; sales: string;
    needMax: string; maxBelowPrice: string; lowRate: string; package: string; noPackage: string;
  };
  let { labels, regions, lowPrice, packages, packageSeatingExtra, defaultPrice, defaultQuantity, intl }: {
    labels: Labels; regions: Region[]; lowPrice: LowPrice; packages: Package[]; packageSeatingExtra: number;
    defaultPrice: number; defaultQuantity: number; intl: string;
  } = $props();

  let regionId = $state(regions[0].id);
  let price = $state(defaultPrice);
  let maxPrice = $state(defaultPrice);
  let qty = $state(defaultQuantity);
  let seated = $state(false);

  const region = $derived(regions.find((r) => r.id === regionId) ?? regions[0]);
  const fmt = (n: number) => region.symbol + n.toLocaleString(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /** Negative, empty or non-numeric input counts as zero: the browser flags it (min="0"), the sum never goes below zero. */
  const num = (v: unknown) => Math.max(0, Number(v) || 0);
  const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

  /** An error text (no number) while the highest price is missing or lower than the category price. */
  const calc = $derived.by(() => {
    const p = num(price), m = num(maxPrice), q = Math.floor(num(qty));
    if (m <= 0) return { error: labels.needMax } as const;
    if (m < p) return { error: labels.maxBelowPrice } as const;
    const low = isLowPriceEvent(m, lowPrice);
    const perTicket = low ? lowPriceFee(p, lowPrice, seated) : standardFee(region.perTicket, region.seatingExtra, seated);
    const fee = round2(q * perTicket);
    let extra = '';
    if (low) {
      extra = fill(labels.lowRate, { max: region.symbol + lowPrice.max_ticket, percent: lowPrice.percent, min: fmt(lowPrice.min), cap: fmt(lowPrice.max) });
    } else if (q > 0) {
      const pack = packageFor(packages, packageSeatingExtra, q, seated);
      if (pack) {
        const cost = round2(q * packageFee(pack, packageSeatingExtra, seated));
        extra = fill(labels.package, { name: pack.name, prepay: fmt(pack.prepay), cost: fmt(cost), left: fmt(round2(pack.prepay - cost)) });
      } else {
        extra = labels.noPackage;
      }
    }
    return { fee, extra, net: p * q } as const;
  });
</script>

<form class="card calc" aria-label={labels.aria} onsubmit={(e) => e.preventDefault()}>
  <label for="cRegion">{labels.region}
    <select id="cRegion" bind:value={regionId}>{#each regions as r}<option value={r.id}>{r.label}</option>{/each}</select>
  </label>
  <label for="cPrice">{labels.price} ({region.symbol})<input type="number" id="cPrice" bind:value={price} min="0" step="1" inputmode="decimal"></label>
  <label for="cMax">{labels.maxPrice} ({region.symbol})<input type="number" id="cMax" bind:value={maxPrice} min="0" step="1" inputmode="decimal"></label>
  <label for="cQty">{labels.quantity}<input type="number" id="cQty" bind:value={qty} min="0" step="1" inputmode="numeric"></label>
  <div class="tog"><input type="checkbox" id="cSeat" bind:checked={seated} style="width:18px;height:18px;accent-color:var(--accent)"><label for="cSeat" style="font-weight:500;color:var(--fg)">{labels.seating}</label></div>
  <div class="out" aria-live="polite">
    {#if 'error' in calc}
      <div class="l">{calc.error}</div>
    {:else}
      <div class="v num">{fmt(calc.fee)}</div>
      <div class="l">{labels.result} · {labels.sales.replace('{net}', fmt(calc.net))}</div>
      {#if calc.extra}<div class="l" style="margin-top:6px">{calc.extra}</div>{/if}
    {/if}
  </div>
</form>

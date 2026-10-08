<script lang="ts">
  /** Fee calculator: per-ticket price from pricing data, +seating extra; values from content/data. */
  type Labels = { aria: string; price: string; quantity: string; seating: string; result: string; sales: string };
  let { labels, perTicket, seatingExtra, symbol, defaultPrice, defaultQuantity, intl }: {
    labels: Labels; perTicket: number; seatingExtra: number; symbol: string; defaultPrice: number; defaultQuantity: number; intl: string;
  } = $props();

  let price = $state(defaultPrice);
  let qty = $state(defaultQuantity);
  let seating = $state(false);

  const fmt = (n: number) => symbol + n.toLocaleString(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fee = $derived((+qty || 0) * (perTicket + (seating ? seatingExtra : 0)));
  const net = $derived((+price || 0) * (+qty || 0));
  const salesText = $derived(labels.sales.replace('{net}', fmt(net)));
</script>

<form class="card calc" aria-label={labels.aria} onsubmit={(e) => e.preventDefault()}>
  <label for="cPrice">{labels.price}<input type="number" id="cPrice" bind:value={price} min="0" step="1" inputmode="decimal"></label>
  <label for="cQty">{labels.quantity}<input type="number" id="cQty" bind:value={qty} min="0" step="1" inputmode="numeric"></label>
  <div class="tog"><input type="checkbox" id="cSeat" bind:checked={seating} style="width:18px;height:18px;accent-color:var(--accent)"><label for="cSeat" style="font-weight:500;color:var(--fg)">{labels.seating}</label></div>
  <div class="out" aria-live="polite"><div class="v num">{fmt(fee)}</div><div class="l">{labels.result} · {salesText}</div></div>
</form>

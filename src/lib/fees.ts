/**
 * Fee arithmetic of the public pricing (one place for the page, the calculator and the Markdown twin).
 * Works in integer cents so 0.59 + 0.50 never turns into 1.0899999. Numbers come from content/data.
 */
export interface LowPrice { max_ticket: number; percent: number; min: number; max: number; seating_extra: number }
export interface Package { name: string; prepay: number; per_ticket: number }

const c = (n: number) => Math.round(n * 100);
const fromC = (n: number) => n / 100;

/** Pay as you go, standard price: one ticket. */
export function standardFee(perTicket: number, seatingExtra: number, seated: boolean): number {
  return fromC(c(perTicket) + (seated ? c(seatingExtra) : 0));
}

/** Events where every ticket costs at most `max_ticket` (inclusive): percent of the price, clamped, plus the seat extra. */
export function lowPriceFee(price: number, lp: LowPrice, seated: boolean): number {
  const raw = Math.round((c(price) * lp.percent) / 100);
  return fromC(Math.min(Math.max(raw, c(lp.min)), c(lp.max)) + (seated ? c(lp.seating_extra) : 0));
}

export function isLowPriceEvent(maxTicketPrice: number, lp: LowPrice): boolean {
  return maxTicketPrice > 0 && c(maxTicketPrice) <= c(lp.max_ticket);
}

/** Commission of a package for one ticket. */
export function packageFee(p: Package, packageSeatingExtra: number, seated: boolean): number {
  return fromC(c(p.per_ticket) + (seated ? c(packageSeatingExtra) : 0));
}

/** How many tickets the prepayment covers: the whole part of prepay / commission. */
export function packageCapacity(p: Package, packageSeatingExtra: number, seated: boolean): number {
  return Math.floor(c(p.prepay) / c(packageFee(p, packageSeatingExtra, seated)));
}

/** Smallest package that covers `qty` tickets, or undefined above the biggest one. */
export function packageFor(packages: Package[], packageSeatingExtra: number, qty: number, seated: boolean): Package | undefined {
  return [...packages].sort((a, b) => a.prepay - b.prepay).find((p) => packageCapacity(p, packageSeatingExtra, seated) >= qty);
}

/** Venues: percent of the price, at most the venue's seated pay-as-you-go price. */
export function venueFee(price: number, percent: number, cap: number): number {
  return fromC(Math.min(Math.round((c(price) * percent) / 100), c(cap)));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

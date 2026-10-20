import type { PriceEntry, PriceRecord } from '../types';

/** How many of the latest prices paid make up an item's price. Older ones are kept for the record but no longer count. */
export const RECENT = 5;
const KEEP = 30;

/** Every price paid for an item, oldest first. Records saved before the history existed count as one entry. */
export function entriesOf(rec: PriceRecord | undefined): PriceEntry[] {
  if (!rec) return [];
  const list = rec.history?.length ? rec.history : [{ price: rec.price, at: rec.at, by: rec.by }];
  return list.filter((e) => Number.isFinite(e?.price) && e.price >= 0).sort((a, b) => a.at.localeCompare(b.at));
}

/** The price used for costs: the average of the latest few prices paid, so one odd receipt or a promotion doesn't swing it. */
export function estimateOf(entries: PriceEntry[]): number {
  const recent = entries.slice(-RECENT);
  return Math.round((recent.reduce((a, e) => a + e.price, 0) / recent.length) * 100) / 100;
}

const record = (entries: PriceEntry[]): PriceRecord | null => {
  if (!entries.length) return null;
  const kept = entries.slice(-KEEP);
  const last = kept[kept.length - 1];
  return { price: estimateOf(kept), at: last.at, by: last.by, history: kept };
};

/** Adds prices paid (typed in or read off a receipt) to the family's record. */
export function addPrices(prices: Record<string, PriceRecord> | undefined, add: { item: string; price: number; by?: string; via: PriceEntry['via'] }[]): Record<string, PriceRecord> {
  const out = { ...(prices ?? {}) };
  const at = new Date().toISOString();
  for (const a of add) {
    if (!Number.isFinite(a.price) || a.price < 0) continue;
    const rec = record([...entriesOf(out[a.item]), { price: Math.round(a.price * 100) / 100, at, by: a.by, via: a.via }]);
    if (rec) out[a.item] = rec;
  }
  return out;
}

/** Takes one price off the record (a typo), or every price when no time is given. */
export function removePrice(prices: Record<string, PriceRecord> | undefined, item: string, at?: string): Record<string, PriceRecord> {
  const { [item]: rec, ...rest } = prices ?? {};
  if (!at) return rest;
  const left = record(entriesOf(rec).filter((e) => e.at !== at));
  return left ? { ...rest, [item]: left } : rest;
}

const key = (e: PriceEntry) => `${e.at}|${e.price}`;

/**
 * Two phones added prices at the same time: keep both phones' new prices. A price either phone took off since the shared copy stays off.
 */
export function mergePrices(mine: Record<string, PriceRecord> | undefined, was: Record<string, PriceRecord> | undefined, theirs: Record<string, PriceRecord> | undefined): Record<string, PriceRecord> {
  const out: Record<string, PriceRecord> = {};
  for (const item of new Set([...Object.keys(mine ?? {}), ...Object.keys(theirs ?? {}), ...Object.keys(was ?? {})])) {
    const m = entriesOf(mine?.[item]), t = entriesOf(theirs?.[item]), w = entriesOf(was?.[item]);
    const mk = new Set(m.map(key)), tk = new Set(t.map(key));
    const gone = new Set(w.map(key).filter((k) => !mk.has(k) || !tk.has(k)));
    const all = new Map<string, PriceEntry>();
    for (const e of [...m, ...t]) if (!gone.has(key(e))) all.set(key(e), e);
    const rec = record([...all.values()].sort((a, b) => a.at.localeCompare(b.at)));
    if (rec) out[item] = rec;
  }
  return out;
}

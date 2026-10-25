/** Flat i32 stride per market update, matching the wasm generator's output. */
export const UPDATE_STRIDE = 7;

/** Fixed, deterministic list of 50 instrument symbols, mapped by index. */
export const SYMBOLS: readonly string[] = [
  'ALFA', 'BETA', 'CHAR', 'DELT', 'ECHO', 'FOXT', 'GOLF', 'HOTE', 'INDI', 'JULI',
  'KILO', 'LIMA', 'MIKE', 'NOVE', 'OSCA', 'PAPA', 'QUEB', 'ROME', 'SIER', 'TANG',
  'UNIF', 'VICT', 'WHIS', 'XRAY', 'YANK', 'ZULU', 'RAVO', 'RLIE', 'ELTA', 'TROT',
  'OTEL', 'NDIA', 'IETT', 'MBER', 'SCAR', 'EBEC', 'OMEO', 'ERRA', 'ANGO', 'FORM',
  'CTOR', 'SKEY', 'NKEE', 'AFLA', 'VARB', 'RAHC', 'TLED', 'OHCE', 'TXOF', 'FLOG',
];

export interface InstrumentAccumulator {
  lastPriceCents: number | null;
  volume: number;
  /** cents * quantity, summed; stays within Number.MAX_SAFE_INTEGER for many hours at max rate. */
  sumPriceQty: number;
  bidCents: number | null;
  askCents: number | null;
  bidQty: number;
  askQty: number;
}

export interface SnapshotRow {
  symbol: string;
  lastPriceCents: number | null;
  spreadCents: number | null;
  volume: number;
  vwapCents: number | null;
  imbalance: number | null;
}

export function createAccumulators(count: number): InstrumentAccumulator[] {
  return Array.from({ length: count }, () => ({
    lastPriceCents: null,
    volume: 0,
    sumPriceQty: 0,
    bidCents: null,
    askCents: null,
    bidQty: 0,
    askQty: 0,
  }));
}

/** Apply every update in a flat i32 batch (stride 7) to the accumulators. */
export function applyBatch(acc: InstrumentAccumulator[], updates: Int32Array): void {
  for (let i = 0; i < updates.length; i += UPDATE_STRIDE) {
    const instrumentIndex = updates[i];
    const priceCents = updates[i + 1];
    const tradeQuantity = updates[i + 2];
    const bidCents = updates[i + 3];
    const askCents = updates[i + 4];
    const bidQuantity = updates[i + 5];
    const askQuantity = updates[i + 6];

    const entry = acc[instrumentIndex];
    entry.lastPriceCents = priceCents;
    entry.volume += tradeQuantity;
    entry.sumPriceQty += priceCents * tradeQuantity;
    entry.bidCents = bidCents;
    entry.askCents = askCents;
    entry.bidQty = bidQuantity;
    entry.askQty = askQuantity;
  }
}

export function toSnapshotRows(
  acc: InstrumentAccumulator[],
  symbols: readonly string[],
): SnapshotRow[] {
  return acc.map((entry, index) => {
    const spreadCents =
      entry.bidCents !== null && entry.askCents !== null ? entry.askCents - entry.bidCents : null;
    const vwapCents = entry.volume > 0 ? entry.sumPriceQty / entry.volume : null;
    const qtyDenominator = entry.bidQty + entry.askQty;
    const imbalance = qtyDenominator > 0 ? (entry.bidQty - entry.askQty) / qtyDenominator : null;

    return {
      symbol: symbols[index],
      lastPriceCents: entry.lastPriceCents,
      spreadCents,
      volume: entry.volume,
      vwapCents,
      imbalance,
    };
  });
}

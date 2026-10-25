use crate::prng::Prng;

/// Number of i32 values emitted per market update:
/// `[instrumentIndex, priceCents, tradeQuantity, bidCents, askCents, bidQuantity, askQuantity]`.
pub const STRIDE: usize = 7;

struct InstrumentState {
    mid_cents: i64,
    bid_qty: i64,
    ask_qty: i64,
}

/// Core generator logic, independent of wasm-bindgen so it can be unit
/// tested as plain Rust with `cargo test`.
pub struct GeneratorCore {
    prng: Prng,
    instruments: Vec<InstrumentState>,
}

impl GeneratorCore {
    pub fn new(seed: u64, instrument_count: u32) -> Self {
        let mut prng = Prng::new(seed);
        let count = instrument_count.max(1);
        let instruments = (0..count)
            .map(|_| InstrumentState {
                // Start each instrument at a different plausible price between $50.00 and $500.00.
                mid_cents: prng.next_range(5_000, 50_000),
                bid_qty: prng.next_range(100, 1_000),
                ask_qty: prng.next_range(100, 1_000),
            })
            .collect();
        GeneratorCore { prng, instruments }
    }

    /// Generate `batch_size` market updates as a flat i32 array, stride `STRIDE`.
    pub fn generate(&mut self, batch_size: u32) -> Vec<i32> {
        let instrument_count = self.instruments.len() as i64;
        let mut out = Vec::with_capacity(batch_size as usize * STRIDE);

        for _ in 0..batch_size {
            let idx = self.prng.next_range(0, instrument_count - 1) as usize;
            let mid_step = self.prng.next_range(-25, 25);
            let spread_cents = self.prng.next_range(1, 15);
            let trade_on_ask = self.prng.next_range(0, 1) == 1;
            let trade_qty = self.prng.next_range(1, 500);
            let bid_qty_step = self.prng.next_range(-40, 40);
            let ask_qty_step = self.prng.next_range(-40, 40);

            let inst = &mut self.instruments[idx];

            // Random-walk the mid, keeping enough headroom that bid stays >= 1 cent.
            let min_mid = 100 + spread_cents;
            inst.mid_cents = (inst.mid_cents + mid_step).max(min_mid);

            let half_spread = spread_cents / 2;
            let bid_cents = (inst.mid_cents - half_spread).max(1);
            let ask_cents = bid_cents + spread_cents.max(1);

            let price_cents = if trade_on_ask { ask_cents } else { bid_cents };

            inst.bid_qty = (inst.bid_qty + bid_qty_step).max(0);
            inst.ask_qty = (inst.ask_qty + ask_qty_step).max(0);

            out.push(idx as i32);
            out.push(price_cents as i32);
            out.push(trade_qty as i32);
            out.push(bid_cents as i32);
            out.push(ask_cents as i32);
            out.push(inst.bid_qty as i32);
            out.push(inst.ask_qty as i32);
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn invariants_hold(row: &[i32], instrument_count: u32) {
        let [idx, price, qty, bid, ask, bid_qty, ask_qty] = <[i32; 7]>::try_from(row).unwrap();
        assert!((idx as u32) < instrument_count, "index in range");
        assert!(bid < ask, "bid strictly below ask");
        assert!(bid >= 1, "bid at least 1 cent");
        assert!(price == bid || price == ask, "trade price is bid or ask");
        assert!(qty >= 1, "trade quantity positive");
        assert!(bid_qty >= 0, "bid qty nonnegative");
        assert!(ask_qty >= 0, "ask qty nonnegative");
    }

    #[test]
    fn exact_batch_sizes() {
        for &batch_size in &[1u32, 100, 1000] {
            let mut gen = GeneratorCore::new(1, 5);
            let out = gen.generate(batch_size);
            assert_eq!(out.len(), batch_size as usize * STRIDE);
        }
    }

    #[test]
    fn invariants_hold_over_many_batches() {
        let instrument_count = 10;
        let mut gen = GeneratorCore::new(123, instrument_count);
        for _ in 0..50 {
            let out = gen.generate(200);
            for row in out.chunks(STRIDE) {
                invariants_hold(row, instrument_count);
            }
        }
    }

    #[test]
    fn same_seed_same_output() {
        let mut a = GeneratorCore::new(999, 5);
        let mut b = GeneratorCore::new(999, 5);
        assert_eq!(a.generate(50), b.generate(50));
    }

    #[test]
    fn different_seed_different_output() {
        let mut a = GeneratorCore::new(1, 5);
        let mut b = GeneratorCore::new(2, 5);
        assert_ne!(a.generate(50), b.generate(50));
    }

    #[test]
    fn prices_evolve_within_bounded_step_per_instrument() {
        let instrument_count = 3;
        let mut gen = GeneratorCore::new(5, instrument_count);
        let mut last_mid_for: Vec<Option<i32>> = vec![None; instrument_count as usize];

        for _ in 0..500 {
            let out = gen.generate(1);
            let idx = out[0] as usize;
            let bid = out[3];
            let ask = out[4];
            let mid = (bid + ask) / 2;
            if let Some(prev) = last_mid_for[idx] {
                // mid_step is bounded to [-25, 25] per hit, spread changes by at most
                // a few cents either side, so consecutive mids for one instrument
                // must stay within a small bounded range, not jump arbitrarily.
                assert!(
                    (mid - prev).abs() <= 50,
                    "mid moved too far for one instrument: {} -> {}",
                    prev,
                    mid
                );
            }
            last_mid_for[idx] = Some(mid);
        }
    }

    #[test]
    fn single_instrument_always_index_zero() {
        let mut gen = GeneratorCore::new(42, 1);
        let out = gen.generate(20);
        for row in out.chunks(STRIDE) {
            assert_eq!(row[0], 0);
        }
    }
}

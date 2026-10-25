/// xorshift64* pseudo-random number generator.
///
/// A small, dependency-free PRNG: deterministic for a given seed, which
/// makes the generator's output reproducible and easy to unit test.
pub struct Prng {
    state: u64,
}

impl Prng {
    pub fn new(seed: u64) -> Self {
        // xorshift64* is undefined for a zero state, so nudge it.
        let state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
        Prng { state }
    }

    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.state = x;
        x.wrapping_mul(0x2545F4914F6CDD1D)
    }

    /// Inclusive random integer in `[lo, hi]`.
    pub fn next_range(&mut self, lo: i64, hi: i64) -> i64 {
        debug_assert!(hi >= lo);
        let span = (hi - lo + 1) as u64;
        lo + (self.next_u64() % span) as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_seed_same_sequence() {
        let mut a = Prng::new(42);
        let mut b = Prng::new(42);
        for _ in 0..100 {
            assert_eq!(a.next_u64(), b.next_u64());
        }
    }

    #[test]
    fn different_seeds_diverge() {
        let mut a = Prng::new(1);
        let mut b = Prng::new(2);
        let seq_a: Vec<u64> = (0..10).map(|_| a.next_u64()).collect();
        let seq_b: Vec<u64> = (0..10).map(|_| b.next_u64()).collect();
        assert_ne!(seq_a, seq_b);
    }

    #[test]
    fn next_range_respects_bounds() {
        let mut p = Prng::new(7);
        for _ in 0..10_000 {
            let v = p.next_range(-5, 5);
            assert!(v >= -5 && v <= 5);
        }
    }

    #[test]
    fn zero_seed_does_not_panic() {
        let mut p = Prng::new(0);
        let v = p.next_range(0, 10);
        assert!(v >= 0 && v <= 10);
    }
}

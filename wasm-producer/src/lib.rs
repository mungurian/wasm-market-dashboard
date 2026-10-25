mod generator;
mod prng;

use generator::GeneratorCore;
use wasm_bindgen::prelude::*;

/// Wasm-facing wrapper around [`GeneratorCore`]. Kept thin so the actual
/// randomness and price-evolution logic (in `generator.rs`) can be unit
/// tested as plain Rust without pulling in wasm-bindgen glue.
#[wasm_bindgen]
pub struct Generator {
    core: GeneratorCore,
}

#[wasm_bindgen]
impl Generator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64, instrument_count: u32) -> Generator {
        Generator {
            core: GeneratorCore::new(seed, instrument_count),
        }
    }

    /// Generate `batch_size` market updates, flattened with stride 7:
    /// `[instrumentIndex, priceCents, tradeQuantity, bidCents, askCents, bidQuantity, askQuantity]`.
    pub fn generate(&mut self, batch_size: u32) -> Vec<i32> {
        self.core.generate(batch_size)
    }
}

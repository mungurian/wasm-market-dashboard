/// <reference lib="webworker" />

/**
 * Proof-of-concept worker for milestone 2: load the Wasm module inside a
 * real Web Worker and run one generator call, to prove the build/bundle
 * pipeline (esbuild worker bundling + wasm-bindgen web target) works
 * end-to-end before the real ProducerEngine is built on top of it.
 */
import init, { Generator } from '../../wasm-pkg/wasm_producer.js';

async function main() {
  await init();
  const generator = new Generator(42n, 3);
  const batch = generator.generate(5);
  postMessage({ type: 'poc-result', batch: Array.from(batch) });
}

main().catch((err) => postMessage({ type: 'poc-error', message: String(err) }));

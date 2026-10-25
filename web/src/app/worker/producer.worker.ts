/// <reference lib="webworker" />

import init, { Generator } from '../../wasm-pkg/wasm_producer.js';
import type { UiToWorkerMessage, WorkerToUiMessage } from '../core/protocol';
import { ProducerEngine, RealTimeScheduler, type GeneratorLike } from './producer-engine';

function post(message: WorkerToUiMessage): void {
  postMessage(message);
}

async function main(): Promise<void> {
  try {
    await init();
  } catch (err) {
    post({ type: 'error', message: `Wasm init failed: ${String(err)}` });
    return;
  }

  const generatorFactory = (seed: number, instrumentCount: number): GeneratorLike =>
    new Generator(BigInt(seed), instrumentCount);

  const engine = new ProducerEngine(generatorFactory, new RealTimeScheduler(), post);

  onmessage = (event: MessageEvent<UiToWorkerMessage>) => {
    const message = event.data;
    switch (message.type) {
      case 'start':
        engine.start(message.runId, message.settings);
        break;
      case 'pause':
        engine.pause(message.runId);
        break;
      case 'resume':
        engine.resume(message.runId);
        break;
    }
  };

  post({ type: 'ready' });
}

main();

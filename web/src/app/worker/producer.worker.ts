/// <reference lib="webworker" />

import init, { Generator } from '../../wasm-pkg/wasm_producer.js';
import type { UiToWorkerMessage, WorkerToUiMessage } from '../core/protocol';
import { ProducerEngine, RealTimeScheduler, type GeneratorLike } from './producer-engine';

function post(message: WorkerToUiMessage): void {
  postMessage(message);
}

let engine: ProducerEngine | null = null;
const pendingMessages: UiToWorkerMessage[] = [];

function dispatch(message: UiToWorkerMessage): void {
  if (!engine) {
    pendingMessages.push(message);
    return;
  }
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
}

// Attached synchronously so no message sent while Wasm is still loading is lost.
onmessage = (event: MessageEvent<UiToWorkerMessage>) => dispatch(event.data);

async function main(): Promise<void> {
  try {
    await init();
  } catch (err) {
    post({ type: 'error', message: `Wasm init failed: ${String(err)}` });
    return;
  }

  const generatorFactory = (seed: number, instrumentCount: number): GeneratorLike =>
    new Generator(BigInt(seed), instrumentCount);

  engine = new ProducerEngine(generatorFactory, new RealTimeScheduler(), post);
  for (const message of pendingMessages.splice(0)) dispatch(message);

  post({ type: 'ready' });
}

main();

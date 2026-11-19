import type { WorkerLike } from '../core/producer-store';
import type { UiToWorkerMessage, WorkerToUiMessage } from '../core/protocol';

/**
 * Shared `WorkerLike` test double for `WORKER_FACTORY` overrides. Records
 * every posted message and lets a test simulate a message coming back from
 * the worker via `emit()`, without a real Worker or Wasm.
 */
export class FakeWorker implements WorkerLike {
  readonly posted: UiToWorkerMessage[] = [];
  onmessage: ((event: MessageEvent<WorkerToUiMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  postMessage(message: UiToWorkerMessage): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: WorkerToUiMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerToUiMessage>);
  }
}

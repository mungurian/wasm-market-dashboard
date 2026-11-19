import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { createAccumulators, SYMBOLS, toSnapshotRows, type SnapshotRow } from './metrics';
import { DEFAULT_SETTINGS, type ProducerSettings, type UiToWorkerMessage, type WorkerToUiMessage } from './protocol';

/** Structural subset of `Worker` the store depends on, so tests can supply a fake. */
export interface WorkerLike {
  postMessage(message: UiToWorkerMessage): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerToUiMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

function createRealWorker(): WorkerLike {
  return new Worker(new URL('../worker/producer.worker', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike;
}

export const WORKER_FACTORY = new InjectionToken<() => WorkerLike>('WORKER_FACTORY', {
  factory: () => createRealWorker,
});

export type ProducerUiStatus = 'initializing' | 'running' | 'paused' | 'error';

function emptyRows(settings: ProducerSettings): SnapshotRow[] {
  return toSnapshotRows(
    createAccumulators(settings.instrumentCount),
    SYMBOLS.slice(0, settings.instrumentCount),
  );
}

/**
 * Owns the single producer worker for the whole app. Created once (it's
 * `providedIn: 'root'`), so navigating between pages never spawns another
 * producer. The worker is created via an injected factory so tests can pass
 * a fake instead of a real `Worker`.
 */
@Injectable({ providedIn: 'root' })
export class ProducerStore {
  private readonly worker: WorkerLike;
  private nextRunId = 1;

  readonly settings = signal<ProducerSettings>(DEFAULT_SETTINGS);
  readonly runId = signal(0);
  readonly status = signal<ProducerUiStatus>('initializing');
  readonly error = signal<string | null>(null);
  readonly rows = signal<SnapshotRow[]>(emptyRows(DEFAULT_SETTINGS));
  readonly totalUpdates = signal(0);

  constructor() {
    const workerFactory = inject(WORKER_FACTORY);
    this.worker = workerFactory();
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    this.worker.onerror = (event) => this.setError(event.message || 'Worker error');

    inject(DestroyRef).onDestroy(() => this.worker.terminate());
  }

  apply(settings: ProducerSettings): void {
    this.settings.set(settings);
    const runId = this.nextRunId++;
    this.runId.set(runId);
    this.error.set(null);
    this.rows.set(emptyRows(settings));
    this.totalUpdates.set(0);
    this.worker.postMessage({ type: 'start', runId, settings });
  }

  pause(): void {
    this.worker.postMessage({ type: 'pause', runId: this.runId() });
  }

  resume(): void {
    this.worker.postMessage({ type: 'resume', runId: this.runId() });
  }

  private handleMessage(message: WorkerToUiMessage): void {
    switch (message.type) {
      case 'ready':
        // Kick off the default run once the worker has finished loading Wasm.
        this.apply(this.settings());
        break;
      case 'snapshot':
        if (message.runId !== this.runId()) return;
        this.rows.set(message.rows);
        this.totalUpdates.set(message.totalUpdates);
        break;
      case 'status':
        if (message.runId !== this.runId()) return;
        this.status.set(message.status);
        break;
      case 'error':
        if (message.runId !== undefined && message.runId !== this.runId()) return;
        this.setError(message.message);
        break;
    }
  }

  private setError(message: string): void {
    this.status.set('error');
    this.error.set(message);
  }
}

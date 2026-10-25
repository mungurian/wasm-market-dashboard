import { TestBed } from '@angular/core/testing';
import type { SnapshotRow } from './metrics';
import { ProducerStore, WORKER_FACTORY, type WorkerLike } from './producer-store';
import { DEFAULT_SETTINGS, type ProducerSettings, type UiToWorkerMessage, type WorkerToUiMessage } from './protocol';

class FakeWorker implements WorkerLike {
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

const SETTINGS_A: ProducerSettings = { instrumentCount: 2, updatesPerBatch: 10, batchIntervalMs: 100 };
const SETTINGS_B: ProducerSettings = { instrumentCount: 3, updatesPerBatch: 20, batchIntervalMs: 200 };

function fakeRows(count: number): SnapshotRow[] {
  return Array.from({ length: count }, (_, i) => ({
    symbol: `S${i}`,
    lastPriceCents: 100,
    spreadCents: 1,
    volume: 1,
    vwapCents: 100,
    imbalance: 0,
  }));
}

describe('ProducerStore', () => {
  let worker: FakeWorker;
  let store: ProducerStore;

  beforeEach(() => {
    worker = new FakeWorker();
    TestBed.configureTestingModule({
      providers: [{ provide: WORKER_FACTORY, useValue: () => worker }],
    });
    store = TestBed.inject(ProducerStore);
  });

  it('starts the default run once the worker signals ready', () => {
    worker.emit({ type: 'ready' });

    expect(store.runId()).toBe(1);
    expect(worker.posted).toEqual([{ type: 'start', runId: 1, settings: DEFAULT_SETTINGS }]);
  });

  it('apply resets rows/totals and increments the runId', () => {
    store.apply(SETTINGS_A);
    expect(store.runId()).toBe(1);
    expect(store.rows().length).toBe(2);
    expect(store.totalUpdates()).toBe(0);

    worker.emit({ type: 'snapshot', runId: 1, rows: fakeRows(2), totalUpdates: 50 });
    expect(store.totalUpdates()).toBe(50);

    store.apply(SETTINGS_B);
    expect(store.runId()).toBe(2);
    expect(store.totalUpdates()).toBe(0);
    expect(store.rows().length).toBe(3);
  });

  it('ignores snapshot and status messages whose runId is not current', () => {
    store.apply(SETTINGS_A); // runId 1
    store.apply(SETTINGS_B); // runId 2, supersedes run 1

    worker.emit({ type: 'snapshot', runId: 1, rows: fakeRows(2), totalUpdates: 999 });
    expect(store.totalUpdates()).toBe(0);

    worker.emit({ type: 'status', runId: 1, status: 'paused' });
    expect(store.status()).toBe('initializing');

    worker.emit({ type: 'snapshot', runId: 2, rows: fakeRows(3), totalUpdates: 20 });
    expect(store.totalUpdates()).toBe(20);
  });

  it('apply from a paused run starts a fresh running run', () => {
    store.apply(SETTINGS_A);
    worker.emit({ type: 'status', runId: 1, status: 'paused' });
    expect(store.status()).toBe('paused');

    store.apply(SETTINGS_B);
    expect(worker.posted.at(-1)).toEqual({ type: 'start', runId: 2, settings: SETTINGS_B });

    worker.emit({ type: 'status', runId: 2, status: 'running' });
    expect(store.status()).toBe('running');
  });

  it('pause/resume post the right messages with the current runId', () => {
    store.apply(SETTINGS_A); // runId 1

    store.pause();
    expect(worker.posted.at(-1)).toEqual({ type: 'pause', runId: 1 });

    store.resume();
    expect(worker.posted.at(-1)).toEqual({ type: 'resume', runId: 1 });
  });

  it('surfaces an error message as the error state', () => {
    worker.emit({ type: 'error', message: 'Wasm init failed: boom' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Wasm init failed: boom');
  });

  it('terminates the worker on destroy', () => {
    TestBed.resetTestingModule();
    expect(worker.terminated).toBe(true);
  });
});

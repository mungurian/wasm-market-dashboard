import { applyBatch, createAccumulators, SYMBOLS, toSnapshotRows, type InstrumentAccumulator } from '../core/metrics';
import type { ProducerSettings, ProducerStatus, WorkerToUiMessage } from '../core/protocol';

/** Minimal surface of the wasm `Generator` the engine depends on. */
export interface GeneratorLike {
  generate(batchSize: number): Int32Array;
  /** Releases the underlying wasm memory. Optional so fakes in tests don't need it. */
  free?(): void;
}

export type GeneratorFactory = (seed: number, instrumentCount: number) => GeneratorLike;

/**
 * Abstraction over `setTimeout`/`clearTimeout` so the engine can be driven by
 * a fake, instant scheduler in tests instead of real wall-clock time.
 */
export interface Scheduler {
  schedule(callback: () => void, delayMs: number): number;
  cancel(handle: number): void;
}

export class RealTimeScheduler implements Scheduler {
  schedule(callback: () => void, delayMs: number): number {
    return setTimeout(callback, delayMs) as unknown as number;
  }

  cancel(handle: number): void {
    clearTimeout(handle);
  }
}

/**
 * Owns the generator, the batch timer, and the metric accumulators. Kept as
 * a plain class with injected dependencies so it is unit-testable without a
 * real Worker, real Wasm, or real time. `producer.worker.ts` is a thin
 * adapter that wires this up to `postMessage`/`onmessage`.
 */
export class ProducerEngine {
  private acc: InstrumentAccumulator[] = [];
  private generator: GeneratorLike | null = null;
  private settings: ProducerSettings | null = null;
  private runId = 0;
  private totalUpdates = 0;
  private status: ProducerStatus = 'paused';
  private timerHandle: number | null = null;

  constructor(
    private readonly generatorFactory: GeneratorFactory,
    private readonly scheduler: Scheduler,
    private readonly post: (message: WorkerToUiMessage) => void,
  ) {}

  start(runId: number, settings: ProducerSettings): void {
    this.cancelTimer();
    this.generator?.free?.();
    this.generator = null;
    this.runId = runId;
    this.settings = settings;
    this.acc = createAccumulators(settings.instrumentCount);
    this.totalUpdates = 0;

    try {
      this.generator = this.generatorFactory(runId, settings.instrumentCount);
    } catch (err) {
      this.generator = null;
      this.post({ type: 'error', runId, message: `Generator init failed: ${String(err)}` });
      return;
    }

    this.status = 'running';
    this.post({ type: 'status', runId, status: 'running' });
    this.scheduleNextBatch();
  }

  pause(runId: number): void {
    if (runId !== this.runId || this.status !== 'running') return;
    this.cancelTimer();
    this.status = 'paused';
    this.post({ type: 'status', runId, status: 'paused' });
  }

  resume(runId: number): void {
    if (runId !== this.runId || this.status !== 'paused' || !this.generator) return;
    this.status = 'running';
    this.post({ type: 'status', runId, status: 'running' });
    this.scheduleNextBatch();
  }

  private scheduleNextBatch(): void {
    const settings = this.settings!;
    this.timerHandle = this.scheduler.schedule(() => this.runBatch(), settings.batchIntervalMs);
  }

  private runBatch(): void {
    const settings = this.settings;
    if (!this.generator || !settings) return;

    const updates = this.generator.generate(settings.updatesPerBatch);
    applyBatch(this.acc, updates);
    this.totalUpdates += settings.updatesPerBatch;

    const rows = toSnapshotRows(this.acc, SYMBOLS.slice(0, settings.instrumentCount));
    this.post({ type: 'snapshot', runId: this.runId, rows, totalUpdates: this.totalUpdates });

    if (this.status === 'running') {
      this.scheduleNextBatch();
    }
  }

  private cancelTimer(): void {
    if (this.timerHandle !== null) {
      this.scheduler.cancel(this.timerHandle);
      this.timerHandle = null;
    }
  }
}

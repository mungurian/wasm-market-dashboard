import type { ProducerSettings, WorkerToUiMessage } from '../core/protocol';
import { ProducerEngine, type GeneratorLike, type Scheduler } from './producer-engine';

class FakeScheduler implements Scheduler {
  private nextHandle = 1;
  private pending = new Map<number, () => void>();

  schedule(callback: () => void, _delayMs: number): number {
    const handle = this.nextHandle++;
    this.pending.set(handle, callback);
    return handle;
  }

  cancel(handle: number): void {
    this.pending.delete(handle);
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  /** Fire every currently pending callback once, as if its timeout elapsed. */
  flush(): void {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    for (const callback of callbacks) callback();
  }
}

class FakeGenerator implements GeneratorLike {
  readonly batchSizes: number[] = [];
  freed = false;

  generate(batchSize: number): Int32Array {
    this.batchSizes.push(batchSize);
    const rows: number[] = [];
    for (let i = 0; i < batchSize; i++) {
      rows.push(0, 10_000, 1, 9_990, 10_010, 10, 10);
    }
    return new Int32Array(rows);
  }

  free(): void {
    this.freed = true;
  }
}

const SETTINGS: ProducerSettings = {
  instrumentCount: 3,
  updatesPerBatch: 7,
  batchIntervalMs: 500,
};

function setup() {
  const scheduler = new FakeScheduler();
  const generator = new FakeGenerator();
  const posted: WorkerToUiMessage[] = [];
  const engine = new ProducerEngine(() => generator, scheduler, (msg) => posted.push(msg));
  return { scheduler, generator, posted, engine };
}

describe('ProducerEngine', () => {
  it('requests exactly updatesPerBatch updates on each batch', () => {
    const { scheduler, generator, engine } = setup();
    engine.start(1, SETTINGS);
    scheduler.flush();
    scheduler.flush();

    expect(generator.batchSizes).toEqual([SETTINGS.updatesPerBatch, SETTINGS.updatesPerBatch]);
  });

  it('resets accumulators and totals on start', () => {
    const { scheduler, posted, engine } = setup();
    engine.start(1, SETTINGS);
    scheduler.flush();
    scheduler.flush();
    const lastSnapshotBeforeRestart = posted.filter((m) => m.type === 'snapshot').at(-1) as any;
    expect(lastSnapshotBeforeRestart.totalUpdates).toBe(SETTINGS.updatesPerBatch * 2);

    posted.length = 0;
    engine.start(2, SETTINGS);
    scheduler.flush();
    const firstSnapshotAfterRestart = posted.find((m) => m.type === 'snapshot') as any;
    expect(firstSnapshotAfterRestart.totalUpdates).toBe(SETTINGS.updatesPerBatch);
    expect(firstSnapshotAfterRestart.runId).toBe(2);
  });

  it('pause stops scheduling further batches', () => {
    const { scheduler, generator, engine } = setup();
    engine.start(1, SETTINGS);
    expect(scheduler.pendingCount).toBe(1);

    engine.pause(1);
    expect(scheduler.pendingCount).toBe(0);

    // Nothing left to fire, and no new batch should have been requested.
    scheduler.flush();
    expect(generator.batchSizes).toEqual([]);
  });

  it('resume schedules exactly one new batch without catching up', () => {
    const { scheduler, generator, engine } = setup();
    engine.start(1, SETTINGS);
    engine.pause(1);

    engine.resume(1);
    expect(scheduler.pendingCount).toBe(1);

    scheduler.flush();
    // Exactly one batch ran on resume, not one-per-missed-interval.
    expect(generator.batchSizes).toEqual([SETTINGS.updatesPerBatch]);
  });

  it('posts a status message for start/pause/resume', () => {
    const { posted, engine } = setup();
    engine.start(1, SETTINGS);
    engine.pause(1);
    engine.resume(1);

    const statuses = posted.filter((m) => m.type === 'status').map((m: any) => m.status);
    expect(statuses).toEqual(['running', 'paused', 'running']);
  });

  it('ignores pause/resume for a stale runId', () => {
    const { scheduler, generator, engine } = setup();
    engine.start(1, SETTINGS);
    engine.pause(0); // stale runId, must be ignored
    expect(scheduler.pendingCount).toBe(1);

    scheduler.flush();
    expect(generator.batchSizes).toEqual([SETTINGS.updatesPerBatch]);
  });

  it('frees the previous generator before creating a new one on start()', () => {
    const scheduler = new FakeScheduler();
    const generators: FakeGenerator[] = [];
    const engine = new ProducerEngine(
      () => {
        const generator = new FakeGenerator();
        generators.push(generator);
        return generator;
      },
      scheduler,
      () => {},
    );

    engine.start(1, SETTINGS);
    expect(generators[0].freed).toBe(false);

    engine.start(2, SETTINGS);
    expect(generators[0].freed).toBe(true);
    expect(generators[1].freed).toBe(false);
  });

  it('reports an error when generator init fails, without posting running status', () => {
    const scheduler = new FakeScheduler();
    const posted: WorkerToUiMessage[] = [];
    const engine = new ProducerEngine(
      () => {
        throw new Error('boom');
      },
      scheduler,
      (msg) => posted.push(msg),
    );

    engine.start(1, SETTINGS);

    expect(posted).toEqual([
      { type: 'error', runId: 1, message: expect.stringContaining('boom') },
    ]);
    expect(scheduler.pendingCount).toBe(0);
  });
});

import { TestBed } from '@angular/core/testing';
import { ProducerStore, WORKER_FACTORY, type WorkerLike } from '../../core/producer-store';
import type { UiToWorkerMessage, WorkerToUiMessage } from '../../core/protocol';
import { Settings } from './settings';

class FakeWorker implements WorkerLike {
  readonly posted: UiToWorkerMessage[] = [];
  onmessage: ((event: MessageEvent<WorkerToUiMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage(message: UiToWorkerMessage): void {
    this.posted.push(message);
  }
  terminate(): void {}
}

describe('Settings', () => {
  let worker: FakeWorker;

  beforeEach(() => {
    worker = new FakeWorker();
    TestBed.configureTestingModule({
      providers: [{ provide: WORKER_FACTORY, useValue: () => worker }],
    });
  });

  it('initializes the form from the store defaults and is valid', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.value).toEqual({
      instrumentCount: 5,
      updatesPerBatch: 100,
      batchIntervalMs: 500,
    });
    expect(fixture.componentInstance.form.valid).toBe(true);
  });

  it('does not affect the producer until Apply is pressed', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    worker.posted.length = 0;

    fixture.componentInstance.form.controls.instrumentCount.setValue(10);
    expect(worker.posted).toEqual([]);
  });

  it('applies new settings through the store when valid', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    const store = TestBed.inject(ProducerStore);

    fixture.componentInstance.form.controls.instrumentCount.setValue(10);
    fixture.componentInstance.apply();

    expect(store.settings().instrumentCount).toBe(10);
    expect(worker.posted.at(-1)).toMatchObject({ type: 'start', settings: { instrumentCount: 10 } });
  });

  it('does not apply when the form is invalid', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    const store = TestBed.inject(ProducerStore);

    fixture.componentInstance.form.controls.instrumentCount.setValue(999);
    expect(fixture.componentInstance.form.invalid).toBe(true);

    fixture.componentInstance.apply();
    expect(store.settings().instrumentCount).toBe(5);
  });
});

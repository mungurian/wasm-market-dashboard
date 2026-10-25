import { TestBed } from '@angular/core/testing';
import { WORKER_FACTORY, type WorkerLike } from '../../core/producer-store';
import type { UiToWorkerMessage, WorkerToUiMessage } from '../../core/protocol';
import { Dashboard } from './dashboard';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerToUiMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage(_message: UiToWorkerMessage): void {}
  terminate(): void {}
}

describe('Dashboard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: WORKER_FACTORY, useValue: () => new FakeWorker() }],
    });
  });

  it('renders one row per instrument with unavailable metrics before any data', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('ALFA');
    expect(text).toContain('initializing');
    expect(text).toContain('—');
  });
});

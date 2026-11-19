import { TestBed } from '@angular/core/testing';
import { WORKER_FACTORY } from '../../core/producer-store';
import { FakeWorker } from '../../testing/fake-worker';
import { Dashboard } from './dashboard';

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

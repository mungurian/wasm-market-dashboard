import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProducerStore } from '../../core/producer-store';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly store = inject(ProducerStore);

  protected readonly nominalRatePerSecond = computed(() => {
    const { updatesPerBatch, batchIntervalMs } = this.store.settings();
    return (updatesPerBatch * 1000) / batchIntervalMs;
  });

  protected formatCents(cents: number | null): string {
    if (cents === null) return '—';
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  protected formatImbalance(value: number | null): string {
    if (value === null) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  }

  protected togglePause(): void {
    if (this.store.status() === 'running') {
      this.store.pause();
    } else {
      this.store.resume();
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProducerStore } from '../../core/producer-store';
import { CentsCurrencyPipe, ImbalanceClassPipe, ImbalancePipe, StatusBadgeClassPipe } from './format.pipes';

@Component({
  selector: 'app-dashboard',
  imports: [CentsCurrencyPipe, ImbalanceClassPipe, ImbalancePipe, StatusBadgeClassPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly store = inject(ProducerStore);

  protected readonly nominalRatePerSecond = computed(() => {
    const { updatesPerBatch, batchIntervalMs } = this.store.settings();
    return Math.round(((updatesPerBatch * 1000) / batchIntervalMs) * 10) / 10;
  });

  protected togglePause(): void {
    if (this.store.status() === 'running') {
      this.store.pause();
    } else {
      this.store.resume();
    }
  }
}

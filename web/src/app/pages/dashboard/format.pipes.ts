import { Pipe, PipeTransform } from '@angular/core';
import type { ProducerUiStatus } from '../../core/producer-store';

@Pipe({ name: 'centsCurrency' })
export class CentsCurrencyPipe implements PipeTransform {
  transform(cents: number | null): string {
    if (cents === null) return '—';
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }
}

@Pipe({ name: 'imbalance' })
export class ImbalancePipe implements PipeTransform {
  transform(value: number | null): string {
    if (value === null) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  }
}

@Pipe({ name: 'imbalanceClass' })
export class ImbalanceClassPipe implements PipeTransform {
  transform(value: number | null): string {
    if (value === null) return '';
    return value > 0 ? 'up' : value < 0 ? 'down' : '';
  }
}

@Pipe({ name: 'statusBadgeClass' })
export class StatusBadgeClassPipe implements PipeTransform {
  transform(status: ProducerUiStatus): string {
    switch (status) {
      case 'running':
        return 'status-badge--good';
      case 'paused':
        return 'status-badge--warning';
      case 'error':
        return 'status-badge--critical';
      default:
        return 'status-badge--neutral';
    }
  }
}

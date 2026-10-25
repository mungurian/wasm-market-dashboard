import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProducerStore } from '../../core/producer-store';
import {
  BATCH_INTERVAL_MS_RANGE,
  INSTRUMENT_COUNT_RANGE,
  settingsFieldValidators,
  UPDATES_PER_BATCH_RANGE,
} from '../../core/settings-validators';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  protected readonly store = inject(ProducerStore);

  protected readonly instrumentCountRange = INSTRUMENT_COUNT_RANGE;
  protected readonly updatesPerBatchRange = UPDATES_PER_BATCH_RANGE;
  protected readonly batchIntervalMsRange = BATCH_INTERVAL_MS_RANGE;

  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    instrumentCount: this.fb.control(
      this.store.settings().instrumentCount,
      settingsFieldValidators(INSTRUMENT_COUNT_RANGE),
    ),
    updatesPerBatch: this.fb.control(
      this.store.settings().updatesPerBatch,
      settingsFieldValidators(UPDATES_PER_BATCH_RANGE),
    ),
    batchIntervalMs: this.fb.control(
      this.store.settings().batchIntervalMs,
      settingsFieldValidators(BATCH_INTERVAL_MS_RANGE),
    ),
  });

  apply(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.store.apply({
      instrumentCount: Number(value.instrumentCount),
      updatesPerBatch: Number(value.updatesPerBatch),
      batchIntervalMs: Number(value.batchIntervalMs),
    });
  }
}

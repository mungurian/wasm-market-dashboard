import { FormControl } from '@angular/forms';
import {
  BATCH_INTERVAL_MS_RANGE,
  INSTRUMENT_COUNT_RANGE,
  settingsFieldValidators,
  UPDATES_PER_BATCH_RANGE,
} from './settings-validators';

function controlFor(range: { min: number; max: number }, value: unknown) {
  return new FormControl(value, settingsFieldValidators(range));
}

describe('settings validators', () => {
  it('accepts the spec defaults', () => {
    expect(controlFor(INSTRUMENT_COUNT_RANGE, 5).valid).toBe(true);
    expect(controlFor(UPDATES_PER_BATCH_RANGE, 100).valid).toBe(true);
    expect(controlFor(BATCH_INTERVAL_MS_RANGE, 500).valid).toBe(true);
  });

  it('accepts the boundary values for each field', () => {
    expect(controlFor(INSTRUMENT_COUNT_RANGE, 1).valid).toBe(true);
    expect(controlFor(INSTRUMENT_COUNT_RANGE, 50).valid).toBe(true);
    expect(controlFor(UPDATES_PER_BATCH_RANGE, 1).valid).toBe(true);
    expect(controlFor(UPDATES_PER_BATCH_RANGE, 1000).valid).toBe(true);
    expect(controlFor(BATCH_INTERVAL_MS_RANGE, 50).valid).toBe(true);
    expect(controlFor(BATCH_INTERVAL_MS_RANGE, 2000).valid).toBe(true);
  });

  it('rejects values just outside each range', () => {
    expect(controlFor(INSTRUMENT_COUNT_RANGE, 0).valid).toBe(false);
    expect(controlFor(INSTRUMENT_COUNT_RANGE, 51).valid).toBe(false);
    expect(controlFor(UPDATES_PER_BATCH_RANGE, 0).valid).toBe(false);
    expect(controlFor(UPDATES_PER_BATCH_RANGE, 1001).valid).toBe(false);
    expect(controlFor(BATCH_INTERVAL_MS_RANGE, 49).valid).toBe(false);
    expect(controlFor(BATCH_INTERVAL_MS_RANGE, 2001).valid).toBe(false);
  });

  it('rejects non-integer values', () => {
    const control = controlFor(INSTRUMENT_COUNT_RANGE, 5.5);
    expect(control.valid).toBe(false);
    expect(control.errors?.['integer']).toBeTruthy();
  });

  it('rejects an empty value as required', () => {
    const control = controlFor(INSTRUMENT_COUNT_RANGE, '');
    expect(control.valid).toBe(false);
    expect(control.errors?.['required']).toBeTruthy();
  });
});

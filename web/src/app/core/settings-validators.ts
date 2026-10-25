import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export interface Range {
  readonly min: number;
  readonly max: number;
}

export const INSTRUMENT_COUNT_RANGE: Range = { min: 1, max: 50 };
export const UPDATES_PER_BATCH_RANGE: Range = { min: 1, max: 1000 };
export const BATCH_INTERVAL_MS_RANGE: Range = { min: 50, max: 2000 };

export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  return Number.isInteger(Number(value)) ? null : { integer: true };
}

export function rangeValidator(range: Range): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return num >= range.min && num <= range.max ? null : { range };
  };
}

export function settingsFieldValidators(range: Range): ValidatorFn[] {
  return [Validators.required, integerValidator, rangeValidator(range)];
}

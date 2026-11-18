import { CentsCurrencyPipe, ImbalanceClassPipe, ImbalancePipe, StatusBadgeClassPipe } from './format.pipes';

describe('CentsCurrencyPipe', () => {
  const pipe = new CentsCurrencyPipe();

  it('shows an em dash for null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('formats cents as currency', () => {
    expect(pipe.transform(10_200)).toBe('$102.00');
  });
});

describe('ImbalancePipe', () => {
  const pipe = new ImbalancePipe();

  it('shows an em dash for null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('signs positive values and fixes two decimals', () => {
    expect(pipe.transform(0.2)).toBe('+0.20');
    expect(pipe.transform(-0.2)).toBe('-0.20');
    expect(pipe.transform(0)).toBe('0.00');
  });
});

describe('ImbalanceClassPipe', () => {
  const pipe = new ImbalanceClassPipe();

  it('maps sign to a css class, empty for null/zero', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(0)).toBe('');
    expect(pipe.transform(0.1)).toBe('up');
    expect(pipe.transform(-0.1)).toBe('down');
  });
});

describe('StatusBadgeClassPipe', () => {
  const pipe = new StatusBadgeClassPipe();

  it('maps each status to its badge class', () => {
    expect(pipe.transform('running')).toBe('status-badge--good');
    expect(pipe.transform('paused')).toBe('status-badge--warning');
    expect(pipe.transform('error')).toBe('status-badge--critical');
    expect(pipe.transform('initializing')).toBe('status-badge--neutral');
  });
});

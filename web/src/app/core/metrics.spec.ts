import { applyBatch, createAccumulators, toSnapshotRows } from './metrics';

function updates(...rows: number[][]): Int32Array {
  return new Int32Array(rows.flat());
}

describe('metrics', () => {
  it('matches the worked example from the spec', () => {
    const acc = createAccumulators(1);
    applyBatch(
      acc,
      updates(
        // instrument 0: 10 units @ $100.00, intermediate book state
        [0, 10_000, 10, 9_900, 9_905, 500, 450],
        // instrument 0: 30 units @ $102.00, final book state from the example
        [0, 10_200, 30, 10_196, 10_200, 600, 400],
      ),
    );

    const [row] = toSnapshotRows(acc, ['ALFA']);
    expect(row.lastPriceCents).toBe(10_200);
    expect(row.volume).toBe(40);
    expect(row.vwapCents).toBeCloseTo(10_150, 5); // $101.50
    expect(row.spreadCents).toBe(4); // $0.04
    expect(row.imbalance).toBeCloseTo(0.2, 5);
  });

  it('reports null/zero before any update arrives', () => {
    const acc = createAccumulators(1);
    const [row] = toSnapshotRows(acc, ['ALFA']);

    expect(row.lastPriceCents).toBeNull();
    expect(row.spreadCents).toBeNull();
    expect(row.volume).toBe(0);
    expect(row.vwapCents).toBeNull();
    expect(row.imbalance).toBeNull();
  });

  it('returns null for VWAP and imbalance when their denominators are zero', () => {
    const acc = createAccumulators(1);
    // A trade with zero quantity should never happen from the real generator, but
    // the metric formulas must still degrade to null rather than NaN/Infinity.
    applyBatch(acc, updates([0, 10_000, 0, 9_999, 10_001, 0, 0]));

    const [row] = toSnapshotRows(acc, ['ALFA']);
    expect(row.vwapCents).toBeNull();
    expect(row.imbalance).toBeNull();
    expect(row.spreadCents).toBe(2);
  });

  it('keeps instruments isolated from one another', () => {
    const acc = createAccumulators(2);
    applyBatch(
      acc,
      updates(
        [0, 10_000, 10, 9_990, 10_010, 100, 200],
        [1, 50_000, 5, 49_900, 50_100, 300, 100],
      ),
    );

    const [alfa, beta] = toSnapshotRows(acc, ['ALFA', 'BETA']);
    expect(alfa.lastPriceCents).toBe(10_000);
    expect(alfa.volume).toBe(10);
    expect(beta.lastPriceCents).toBe(50_000);
    expect(beta.volume).toBe(5);
    // Isolation: instrument 1's update must not have touched instrument 0's accumulator.
    expect(alfa.imbalance).toBeCloseTo((100 - 200) / 300, 5);
    expect(beta.imbalance).toBeCloseTo((300 - 100) / 400, 5);
  });

  it('accumulates volume and VWAP across multiple applyBatch calls', () => {
    const acc = createAccumulators(1);
    applyBatch(acc, updates([0, 10_000, 10, 9_990, 10_010, 100, 100]));
    applyBatch(acc, updates([0, 10_200, 30, 10_196, 10_200, 600, 400]));

    const [row] = toSnapshotRows(acc, ['ALFA']);
    expect(row.volume).toBe(40);
    expect(row.vwapCents).toBeCloseTo(10_150, 5);
    expect(row.lastPriceCents).toBe(10_200); // latest batch wins
  });
});

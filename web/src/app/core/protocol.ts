import type { SnapshotRow } from './metrics';

export interface ProducerSettings {
  instrumentCount: number;
  updatesPerBatch: number;
  batchIntervalMs: number;
}

export const DEFAULT_SETTINGS: ProducerSettings = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
};

/** The engine's own running/paused state, as reported by the worker. Distinct
 * from `ProducerUiStatus` (producer-store.ts), which also covers UI-only
 * states like 'initializing' and 'error' that the engine never knows about. */
export type WorkerStatus = 'running' | 'paused';

export type UiToWorkerMessage =
  | { type: 'start'; runId: number; settings: ProducerSettings }
  | { type: 'pause'; runId: number }
  | { type: 'resume'; runId: number };

export type WorkerToUiMessage =
  | { type: 'ready' }
  | { type: 'snapshot'; runId: number; rows: SnapshotRow[]; totalUpdates: number }
  | { type: 'status'; runId: number; status: WorkerStatus }
  | { type: 'error'; runId?: number; message: string };

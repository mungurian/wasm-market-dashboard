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

export type ProducerStatus = 'running' | 'paused';

export type UiToWorkerMessage =
  | { type: 'start'; runId: number; settings: ProducerSettings }
  | { type: 'pause'; runId: number }
  | { type: 'resume'; runId: number };

export type WorkerToUiMessage =
  | { type: 'ready' }
  | { type: 'snapshot'; runId: number; rows: SnapshotRow[]; totalUpdates: number }
  | { type: 'status'; runId: number; status: ProducerStatus }
  | { type: 'error'; runId?: number; message: string };

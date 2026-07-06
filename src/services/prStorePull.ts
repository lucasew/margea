import { SCOPE_STREAM_IDLE, type ScopeStream } from './AdaptiveScopeFetcher';
import { isAbortError } from '../utils/abort';
import type { PullRequest } from '../types';

export interface PullStreamsResult {
  count: number;
  errors: { scope: string; error: Error }[];
  hasActiveStreams: boolean;
}

export interface PullStreamsOptions {
  onBatch: (prs: PullRequest[]) => void;
  batchSize?: number;
  onFirstPr?: () => void;
}

/**
 * Pull each scope generator until it reports idle (or completes). Never calls
 * .next() on the same generator from two overlapping pulls — callers must
 * serialize via createSerialQueue.
 */
export async function pullStreamsUntilIdle(
  streams: Map<string, ScopeStream>,
  options: PullStreamsOptions,
): Promise<PullStreamsResult> {
  const { onBatch, batchSize = 20, onFirstPr } = options;
  const entries = Array.from(streams.entries());
  if (entries.length === 0) {
    return { count: 0, errors: [], hasActiveStreams: false };
  }

  const phase = { count: 0 };
  let sawFirst = false;
  const errors: { scope: string; error: Error }[] = [];

  await Promise.all(
    entries.map(async ([scope, strm]) => {
      const batch: PullRequest[] = [];
      const flush = () => {
        if (batch.length === 0) return;
        onBatch(batch.splice(0, batch.length));
      };

      try {
        while (true) {
          const { value, done } = await strm.generator.next();
          if (done) break;
          if (value === SCOPE_STREAM_IDLE) {
            flush();
            break;
          }
          if (value) {
            batch.push(value);
            phase.count++;
            if (!sawFirst) {
              sawFirst = true;
              onFirstPr?.();
            }
            if (batch.length >= batchSize) flush();
          }
        }
        flush();
      } catch (e) {
        flush();
        const err = e instanceof Error ? e : new Error(String(e));
        if (!isAbortError(err)) {
          errors.push({ scope, error: err });
        }
      }
    }),
  );

  return {
    count: phase.count,
    errors,
    hasActiveStreams: streams.size > 0,
  };
}

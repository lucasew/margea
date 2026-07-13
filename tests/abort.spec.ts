import { expect, test } from '@playwright/test';
import {
  ABORT_SIGNAL_METADATA_KEY,
  abortableSleep,
  createAbortError,
  getAbortSignalFromCacheConfig,
  isAbortError,
} from '../src/utils/abort';

test.describe('createAbortError', () => {
  test('defaults name and message', () => {
    const err = createAbortError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AbortError');
    expect(err.message).toBe('Aborted');
  });

  test('accepts a custom message', () => {
    const err = createAbortError('cancelled by user');
    expect(err.name).toBe('AbortError');
    expect(err.message).toBe('cancelled by user');
  });
});

test.describe('isAbortError', () => {
  test('returns true for createAbortError', () => {
    expect(isAbortError(createAbortError())).toBe(true);
  });

  test('returns true for Error with name AbortError', () => {
    const err = new Error('stopped');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });

  test('returns false for other Errors', () => {
    expect(isAbortError(new Error('fail'))).toBe(false);
  });

  test('returns false for non-Error values', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isAbortError({ name: 'AbortError' })).toBe(false);
  });
});

test.describe('getAbortSignalFromCacheConfig', () => {
  test('returns undefined when config is null or undefined', () => {
    expect(getAbortSignalFromCacheConfig(null)).toBeUndefined();
    expect(getAbortSignalFromCacheConfig(undefined)).toBeUndefined();
  });

  test('returns undefined when metadata is missing or null', () => {
    expect(getAbortSignalFromCacheConfig({})).toBeUndefined();
    expect(getAbortSignalFromCacheConfig({ metadata: null })).toBeUndefined();
  });

  test('returns the signal when metadata has AbortSignal', () => {
    const controller = new AbortController();
    const signal = getAbortSignalFromCacheConfig({
      metadata: { [ABORT_SIGNAL_METADATA_KEY]: controller.signal },
    });
    expect(signal).toBe(controller.signal);
  });

  test('returns undefined for wrong types under abortSignal key', () => {
    expect(
      getAbortSignalFromCacheConfig({
        metadata: { [ABORT_SIGNAL_METADATA_KEY]: 'not-a-signal' },
      }),
    ).toBeUndefined();
    expect(
      getAbortSignalFromCacheConfig({
        metadata: { [ABORT_SIGNAL_METADATA_KEY]: {} },
      }),
    ).toBeUndefined();
    expect(
      getAbortSignalFromCacheConfig({
        metadata: { [ABORT_SIGNAL_METADATA_KEY]: null },
      }),
    ).toBeUndefined();
  });

  test('ignores unrelated metadata keys', () => {
    const controller = new AbortController();
    expect(
      getAbortSignalFromCacheConfig({
        metadata: { other: controller.signal },
      }),
    ).toBeUndefined();
  });
});

test.describe('abortableSleep', () => {
  test('resolves without a signal', async () => {
    const started = Date.now();
    await abortableSleep(40);
    expect(Date.now() - started).toBeGreaterThanOrEqual(30);
  });

  test('rejects when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    let caught: unknown;
    try {
      await abortableSleep(1000, controller.signal);
      throw new Error('expected abortableSleep to reject');
    } catch (err) {
      caught = err;
    }
    expect(isAbortError(caught)).toBe(true);
  });

  test('rejects when aborted during wait', async () => {
    const controller = new AbortController();
    const started = Date.now();
    const sleepPromise = abortableSleep(10_000, controller.signal);
    setTimeout(() => controller.abort(), 40);

    let caught: unknown;
    try {
      await sleepPromise;
      throw new Error('expected abortableSleep to reject');
    } catch (err) {
      caught = err;
    }

    expect(isAbortError(caught)).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test('resolves when signal is present but never aborted', async () => {
    const controller = new AbortController();
    await expect(
      abortableSleep(40, controller.signal),
    ).resolves.toBeUndefined();
  });
});

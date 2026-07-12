import { expect, test } from '@playwright/test';
import { createSerialQueue } from '../src/services/serialQueue';

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test.describe('createSerialQueue', () => {
  test('runs overlapping enqueues strictly in order', async () => {
    const enqueue = createSerialQueue();
    const order: string[] = [];
    const firstGate = deferred();

    const first = enqueue(async () => {
      order.push('first-start');
      await firstGate.promise;
      order.push('first-end');
      return 1;
    });

    const second = enqueue(async () => {
      order.push('second-start');
      order.push('second-end');
      return 2;
    });

    // Yield so the first task can start; second must still be waiting.
    await Promise.resolve();
    expect(order).toEqual(['first-start']);

    firstGate.resolve();
    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
    expect(order).toEqual([
      'first-start',
      'first-end',
      'second-start',
      'second-end',
    ]);
  });

  test('later task does not start until earlier settles', async () => {
    const enqueue = createSerialQueue();
    let laterStarted = false;
    const gate = deferred();

    const earlier = enqueue(async () => {
      await gate.promise;
      return 'earlier';
    });

    const later = enqueue(async () => {
      laterStarted = true;
      return 'later';
    });

    await Promise.resolve();
    expect(laterStarted).toBe(false);

    gate.resolve();
    await expect(earlier).resolves.toBe('earlier');
    await expect(later).resolves.toBe('later');
    expect(laterStarted).toBe(true);
  });

  test('rejection of one task does not break the queue for the next', async () => {
    const enqueue = createSerialQueue();
    const order: string[] = [];

    const failing = enqueue(async () => {
      order.push('fail');
      throw new Error('boom');
    });
    const ok = enqueue(async () => {
      order.push('ok');
      return 'done';
    });

    await expect(failing).rejects.toThrow('boom');
    await expect(ok).resolves.toBe('done');
    expect(order).toEqual(['fail', 'ok']);
  });

  test('completion order matches enqueue order even when work finishes out of natural order', async () => {
    const enqueue = createSerialQueue();
    const completed: number[] = [];
    const gates = [deferred(), deferred(), deferred()];

    const results = [0, 1, 2].map((i) =>
      enqueue(async () => {
        await gates[i].promise;
        completed.push(i);
        return i;
      }),
    );

    // Resolve gates in reverse: without serialization, 2 would finish first.
    gates[2].resolve();
    gates[1].resolve();
    gates[0].resolve();

    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2]);
    expect(completed).toEqual([0, 1, 2]);
  });

  test('returns each task result independently', async () => {
    const enqueue = createSerialQueue();

    const a = enqueue(async () => 'alpha');
    const b = enqueue(async () => 42);
    const c = enqueue(async () => ({ ok: true }));

    await expect(a).resolves.toBe('alpha');
    await expect(b).resolves.toBe(42);
    await expect(c).resolves.toEqual({ ok: true });
  });
});

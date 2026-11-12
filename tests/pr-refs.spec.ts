import { test, expect } from '@playwright/test';
import type { PRRef } from '../src/types';
import {
  buildBundleUrl,
  formatPRRef,
  parseBundleParams,
  parsePRRefs,
  serializePRRefs,
} from '../src/services/prRefs';

const exampleRefs: PRRef[] = [
  { owner: 'lucasew', repo: 'lucasew.github.io', number: 340 },
  { owner: 'lucasew', repo: 'agena', number: 285 },
  { owner: 'lucasew', repo: 'margea', number: 440 },
  { owner: 'lucasew', repo: 'pesquisarr', number: 621 },
];

test.describe('parsePRRefs', () => {
  test('accepts fully qualified github refs', () => {
    expect(parsePRRefs('github:lucasew/margea/440').refs).toEqual([
      { owner: 'lucasew', repo: 'margea', number: 440 },
    ]);
  });

  test('inherits provider and owner for shorthand refs', () => {
    expect(
      parsePRRefs(
        'github:lucasew/lucasew.github.io/340,agena/285,margea/440,pesquisarr/621',
      ).refs,
    ).toEqual(exampleRefs);
  });

  test('an explicit owner resets the inherited owner', () => {
    expect(
      parsePRRefs('github:acme/one/1,github:other/two/2,three/3').refs,
    ).toEqual([
      { owner: 'acme', repo: 'one', number: 1 },
      { owner: 'other', repo: 'two', number: 2 },
      { owner: 'other', repo: 'three', number: 3 },
    ]);
  });

  test('deduplicates refs while preserving order', () => {
    expect(
      parsePRRefs('github:acme/one/1,github:acme/one/1,two/2').refs,
    ).toEqual([
      { owner: 'acme', repo: 'one', number: 1 },
      { owner: 'acme', repo: 'two', number: 2 },
    ]);
  });

  test('reports invalid tokens and keeps parsing valid ones', () => {
    const { refs, invalid } = parsePRRefs(
      'github:gitlab/acme/one/1,acme/two/nope,acme/three/3,four/4,github:acme/five/0',
    );

    expect(refs).toEqual([
      { owner: 'acme', repo: 'three', number: 3 },
      { owner: 'acme', repo: 'four', number: 4 },
    ]);
    expect(invalid).toEqual([
      'github:gitlab/acme/one/1',
      'acme/two/nope',
      'github:acme/five/0',
    ]);
  });

  test('a two-segment ref without an inherited owner is invalid', () => {
    expect(parsePRRefs('margea/440')).toEqual({
      refs: [],
      invalid: ['margea/440'],
    });
  });

  test('empty or missing input yields an empty list', () => {
    expect(parsePRRefs('')).toEqual({ refs: [], invalid: [] });
    expect(parsePRRefs(null)).toEqual({ refs: [], invalid: [] });
    expect(parsePRRefs(undefined)).toEqual({ refs: [], invalid: [] });
  });
});

test.describe('serializePRRefs', () => {
  test('uses the compact sticky-owner form', () => {
    expect(serializePRRefs(exampleRefs)).toBe(
      'github:lucasew/lucasew.github.io/340,agena/285,margea/440,pesquisarr/621',
    );
  });

  test('round-trips through parsePRRefs', () => {
    const serialized = serializePRRefs(exampleRefs);
    expect(parsePRRefs(serialized).refs).toEqual(exampleRefs);
  });

  test('mixes explicit owners when needed', () => {
    expect(
      serializePRRefs([
        { owner: 'acme', repo: 'one', number: 1 },
        { owner: 'other', repo: 'two', number: 2 },
        { owner: 'other', repo: 'three', number: 3 },
      ]),
    ).toBe('github:acme/one/1,other/two/2,three/3');
  });
});

test.describe('buildBundleUrl', () => {
  test('builds a compact link with title and description', () => {
    expect(
      buildBundleUrl(exampleRefs, 'Dependency sweep', 'Merge when green'),
    ).toBe(
      '/b?p=github:lucasew/lucasew.github.io/340,agena/285,margea/440,pesquisarr/621&title=Dependency+sweep&description=Merge+when+green',
    );
  });

  test('round-trips refs, title, and description', () => {
    const built = buildBundleUrl(exampleRefs, 'A & B #1', 'line one\nline two');
    const params = parseBundleParams(
      new URL(built, 'https://margea.example').searchParams,
    );

    expect(params.refs).toEqual(exampleRefs);
    expect(params.title).toBe('A & B #1');
    expect(params.description).toBe('line one\nline two');
    expect(params.invalid).toEqual([]);
  });

  test('keeps the example link well below common URL length limits', () => {
    const url = new URL(
      buildBundleUrl(
        exampleRefs,
        'Dependency sweep across four repositories',
        'All four pull requests should merge cleanly once CI is green.',
      ),
      'https://margea.example',
    );

    expect(url.href.length).toBeLessThan(2048);
  });

  test('omits empty optional params', () => {
    expect(buildBundleUrl([])).toBe('/b');
    expect(buildBundleUrl(exampleRefs)).toBe(
      '/b?p=github:lucasew/lucasew.github.io/340,agena/285,margea/440,pesquisarr/621',
    );
  });
});

test.describe('parseBundleParams', () => {
  test('accepts the legacy short aliases', () => {
    const params = parseBundleParams(
      new URLSearchParams({
        prs: 'github:acme/one/1',
        desc: 'Alias description',
      }),
    );

    expect(params.refs).toEqual([{ owner: 'acme', repo: 'one', number: 1 }]);
    expect(params.title).toBe('');
    expect(params.description).toBe('Alias description');
  });

  test('formats refs for messages', () => {
    expect(formatPRRef(exampleRefs[0])).toBe('lucasew/lucasew.github.io#340');
  });
});

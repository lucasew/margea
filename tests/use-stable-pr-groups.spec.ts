import { test, expect } from '@playwright/test';
import {
  createElement,
  useState,
  act,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { GroupingStrategy, PullRequest, SortStrategy } from '../src/types';
import { useStablePRGroups } from '../src/hooks/useStablePRGroups';
import { makePR } from './utils/makePR';

/** React act() needs this flag outside Jest/RTL. */
function enableReactActEnvironment() {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
}

/**
 * Minimal DOM so react-dom/client can mount in Playwright's Node test worker.
 * Only the surface React 19 touches for a div host is implemented.
 */
function installMinimalDom() {
  const g = globalThis as typeof globalThis & {
    document?: { __minimal?: boolean };
    window?: unknown;
  };
  if (g.document?.__minimal) return;

  type FakeNode = {
    nodeType: number;
    nodeName: string;
    tagName?: string;
    style: Record<string, string>;
    attributes: Record<string, string>;
    childNodes: FakeNode[];
    parentNode: FakeNode | null;
    ownerDocument: FakeDocument | null;
    textContent: string;
    innerHTML: string;
    className: string;
    namespaceURI: string;
    data?: string;
    setAttribute: (k: string, v: string) => void;
    getAttribute: (k: string) => string | null;
    removeAttribute: (k: string) => void;
    hasAttribute: (k: string) => boolean;
    appendChild: (c: FakeNode) => FakeNode;
    removeChild: (c: FakeNode) => FakeNode;
    insertBefore: (c: FakeNode, ref: FakeNode | null) => FakeNode;
    addEventListener: () => void;
    removeEventListener: () => void;
    dispatchEvent: () => boolean;
    focus: () => void;
    blur: () => void;
    click: () => void;
    contains: (n: FakeNode) => boolean;
    cloneNode: () => FakeNode;
    firstChild: FakeNode | null;
    lastChild: FakeNode | null;
    nextSibling: null;
    previousSibling: null;
    getElementsByTagName: () => FakeNode[];
    querySelector: () => null;
    querySelectorAll: () => FakeNode[];
  };

  type FakeDocument = {
    __minimal: true;
    nodeType: number;
    documentElement: FakeNode;
    head: FakeNode;
    body: FakeNode;
    defaultView: unknown;
    createElement: (tag: string) => FakeNode;
    createElementNS: (_ns: string, tag: string) => FakeNode;
    createTextNode: (text: string) => FakeNode;
    createComment: (text: string) => FakeNode;
    createDocumentFragment: () => FakeNode;
    getElementById: () => null;
    querySelector: () => null;
    querySelectorAll: () => FakeNode[];
    addEventListener: () => void;
    removeEventListener: () => void;
  };

  const createEl = (tag: string): FakeNode => {
    const el: FakeNode = {
      nodeType: 1,
      nodeName: String(tag).toUpperCase(),
      tagName: String(tag).toUpperCase(),
      style: {},
      attributes: {},
      childNodes: [],
      parentNode: null,
      ownerDocument: null,
      textContent: '',
      innerHTML: '',
      className: '',
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      setAttribute(k, v) {
        this.attributes[k] = v;
        if (k === 'class') this.className = v;
      },
      getAttribute(k) {
        return this.attributes[k] ?? null;
      },
      removeAttribute(k) {
        delete this.attributes[k];
      },
      hasAttribute(k) {
        return k in this.attributes;
      },
      appendChild(c) {
        c.parentNode = this;
        this.childNodes.push(c);
        return c;
      },
      removeChild(c) {
        this.childNodes = this.childNodes.filter((x) => x !== c);
        c.parentNode = null;
        return c;
      },
      insertBefore(c, ref) {
        c.parentNode = this;
        if (!ref) {
          this.childNodes.push(c);
        } else {
          const i = this.childNodes.indexOf(ref);
          this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, c);
        }
        return c;
      },
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      focus() {},
      blur() {},
      click() {},
      contains(n) {
        return (
          this === n || this.childNodes.some((c) => c === n || c.contains(n))
        );
      },
      cloneNode() {
        return createEl(tag);
      },
      get firstChild() {
        return this.childNodes[0] ?? null;
      },
      get lastChild() {
        return this.childNodes[this.childNodes.length - 1] ?? null;
      },
      nextSibling: null,
      previousSibling: null,
      getElementsByTagName() {
        return [];
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    };
    return el;
  };

  const document = {
    __minimal: true as const,
    nodeType: 9,
    documentElement: null as unknown as FakeNode,
    head: null as unknown as FakeNode,
    body: null as unknown as FakeNode,
    defaultView: null as unknown,
    createElement: createEl,
    createElementNS(_ns: string, tag: string) {
      return createEl(tag);
    },
    createTextNode(text: string) {
      return {
        ...createEl('#text'),
        nodeType: 3,
        nodeName: '#text',
        data: String(text),
        textContent: String(text),
        ownerDocument: document as unknown as FakeDocument,
      };
    },
    createComment(text: string) {
      return {
        ...createEl('#comment'),
        nodeType: 8,
        nodeName: '#comment',
        data: String(text),
        ownerDocument: document as unknown as FakeDocument,
      };
    },
    createDocumentFragment() {
      return createEl('#document-fragment');
    },
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };

  document.documentElement = createEl('html');
  document.head = createEl('head');
  document.body = createEl('body');
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);
  for (const n of [document.documentElement, document.head, document.body]) {
    n.ownerDocument = document as unknown as FakeDocument;
  }
  const origCreate = document.createElement.bind(document);
  document.createElement = (tag: string) => {
    const el = origCreate(tag);
    el.ownerDocument = document as unknown as FakeDocument;
    return el;
  };

  const windowObj = {
    document,
    HTMLIFrameElement: function HTMLIFrameElement() {},
    HTMLElement: function HTMLElement() {},
    Element: function Element() {},
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1, COMMENT_NODE: 8, DOCUMENT_NODE: 9 },
    addEventListener() {},
    removeEventListener() {},
    getComputedStyle() {
      return {
        getPropertyValue: () => '',
        getPropertyPriority: () => '',
      };
    },
    requestAnimationFrame(cb: (t: number) => void) {
      return setTimeout(() => cb(Date.now()), 0) as unknown as number;
    },
    cancelAnimationFrame(id: number) {
      clearTimeout(id);
    },
    navigator: { userAgent: 'node' },
    location: {
      href: 'http://localhost/',
      protocol: 'http:',
      pathname: '/',
      search: '',
      hash: '',
    },
    top: null as unknown,
    self: null as unknown,
    parent: null as unknown,
    window: null as unknown,
  };
  windowObj.top = windowObj;
  windowObj.self = windowObj;
  windowObj.parent = windowObj;
  windowObj.window = windowObj;
  document.defaultView = windowObj;

  const define = (key: string, value: unknown) => {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  };
  define('window', windowObj);
  define('document', document);
  define('HTMLIFrameElement', windowObj.HTMLIFrameElement);
  define('HTMLElement', windowObj.HTMLElement);
  define('Element', windowObj.Element);
  define('Node', windowObj.Node);
  define('requestAnimationFrame', windowObj.requestAnimationFrame);
  define('cancelAnimationFrame', windowObj.cancelAnimationFrame);
  define('getComputedStyle', windowObj.getComputedStyle);
}

/** Renovate grouping key = normalizedTitle|author */
function renovateKey(title: string, author = 'bot') {
  return `${title}|${author}`;
}

type HarnessApi = {
  keys: string[];
  counts: number[];
  setPrs: Dispatch<SetStateAction<PullRequest[]>>;
  setFilterKey: Dispatch<SetStateAction<string>>;
  setGroupingStrategy: Dispatch<SetStateAction<GroupingStrategy>>;
  setSortStrategy: Dispatch<SetStateAction<SortStrategy>>;
};

type HarnessOptions = {
  prs: PullRequest[];
  filterKey: string;
  groupingStrategy?: GroupingStrategy;
  sortStrategy?: SortStrategy;
};

/**
 * Mounts useStablePRGroups in a tiny host component and exposes setters
 * so tests can simulate infinite-scroll prs updates and filterKey resets.
 */
function createHarness(initial: HarnessOptions) {
  enableReactActEnvironment();
  installMinimalDom();

  let api: HarnessApi | undefined;

  function Host() {
    const [prs, setPrs] = useState(initial.prs);
    const [filterKey, setFilterKey] = useState(initial.filterKey);
    const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>(
      initial.groupingStrategy ?? 'renovate',
    );
    const [sortStrategy, setSortStrategy] = useState<SortStrategy>(
      initial.sortStrategy ?? 'count',
    );
    const groups = useStablePRGroups(
      prs,
      filterKey,
      groupingStrategy,
      sortStrategy,
    );
    api = {
      keys: groups.map((g) => g.key),
      counts: groups.map((g) => g.count),
      setPrs,
      setFilterKey,
      setGroupingStrategy,
      setSortStrategy,
    };
    return createElement('div', null, api.keys.join(','));
  }

  const rootEl = (
    globalThis as typeof globalThis & {
      document: {
        createElement: (t: string) => unknown;
        body: { appendChild: (n: unknown) => void };
      };
    }
  ).document.createElement('div');
  (
    globalThis as typeof globalThis & {
      document: { body: { appendChild: (n: unknown) => void } };
    }
  ).document.body.appendChild(rootEl);

  const root: Root = createRoot(rootEl as Element);

  return {
    async render(): Promise<HarnessApi> {
      await act(async () => {
        flushSync(() => {
          root.render(createElement(Host));
        });
      });
      if (!api) throw new Error('harness did not capture hook output');
      return api;
    },
    async update(fn: (api: HarnessApi) => void): Promise<HarnessApi> {
      if (!api) throw new Error('harness not rendered');
      await act(async () => {
        flushSync(() => {
          fn(api!);
        });
      });
      if (!api) throw new Error('harness lost hook output');
      return api;
    },
    unmount() {
      root.unmount();
    },
  };
}

test.describe('useStablePRGroups', () => {
  test('initial order follows sort strategy (count descending)', async () => {
    const prs = [
      makePR('a1', { title: 'alpha', url: 'https://example.com/a1' }),
      makePR('a2', { title: 'alpha', url: 'https://example.com/a2' }),
      makePR('b1', { title: 'beta', url: 'https://example.com/b1' }),
      makePR('c1', { title: 'gamma', url: 'https://example.com/c1' }),
      makePR('c2', { title: 'gamma', url: 'https://example.com/c2' }),
      makePR('c3', { title: 'gamma', url: 'https://example.com/c3' }),
    ];

    const harness = createHarness({
      prs,
      filterKey: 'filter-a',
      sortStrategy: 'count',
    });
    try {
      const api = await harness.render();
      // count desc: gamma(3), alpha(2), beta(1)
      expect(api.keys).toEqual([
        renovateKey('gamma'),
        renovateKey('alpha'),
        renovateKey('beta'),
      ]);
      expect(api.counts).toEqual([3, 2, 1]);
    } finally {
      harness.unmount();
    }
  });

  test('initial order follows name sort (package A–Z)', async () => {
    const prs = [
      makePR('z1', { title: 'zeta', url: 'https://example.com/z1' }),
      makePR('a1', { title: 'alpha', url: 'https://example.com/a1' }),
      makePR('m1', { title: 'mu', url: 'https://example.com/m1' }),
    ];

    const harness = createHarness({
      prs,
      filterKey: 'filter-name',
      sortStrategy: 'name',
    });
    try {
      const api = await harness.render();
      expect(api.keys).toEqual([
        renovateKey('alpha'),
        renovateKey('mu'),
        renovateKey('zeta'),
      ]);
    } finally {
      harness.unmount();
    }
  });

  test('new groups from infinite-scroll append without reshuffling existing keys', async () => {
    const page1 = [
      makePR('a1', { title: 'alpha', url: 'https://example.com/a1' }),
      makePR('a2', { title: 'alpha', url: 'https://example.com/a2' }),
      makePR('b1', { title: 'beta', url: 'https://example.com/b1' }),
    ];
    // Fresh sort-by-count: alpha(2), beta(1)
    const harness = createHarness({
      prs: page1,
      filterKey: 'scroll-1',
      sortStrategy: 'count',
    });
    try {
      let api = await harness.render();
      expect(api.keys).toEqual([renovateKey('alpha'), renovateKey('beta')]);

      // Page 2 adds a larger group that would sort first if fully re-sorted.
      const page2 = [
        ...page1,
        makePR('z1', { title: 'zeta', url: 'https://example.com/z1' }),
        makePR('z2', { title: 'zeta', url: 'https://example.com/z2' }),
        makePR('z3', { title: 'zeta', url: 'https://example.com/z3' }),
      ];
      api = await harness.update((a) => a.setPrs(page2));

      // Existing keys keep positions; newcomer zeta is appended (not teleported to front).
      expect(api.keys).toEqual([
        renovateKey('alpha'),
        renovateKey('beta'),
        renovateKey('zeta'),
      ]);
      expect(api.counts).toEqual([2, 1, 3]);
    } finally {
      harness.unmount();
    }
  });

  test('existing groups keep order when their counts change on later pages', async () => {
    const page1 = [
      makePR('a1', { title: 'alpha', url: 'https://example.com/a1' }),
      makePR('b1', { title: 'beta', url: 'https://example.com/b1' }),
      makePR('b2', { title: 'beta', url: 'https://example.com/b2' }),
    ];
    // count: beta(2), alpha(1)
    const harness = createHarness({
      prs: page1,
      filterKey: 'scroll-counts',
      sortStrategy: 'count',
    });
    try {
      let api = await harness.render();
      expect(api.keys).toEqual([renovateKey('beta'), renovateKey('alpha')]);

      // Grow alpha so a full re-sort would put alpha first — stable order must hold.
      const page2 = [
        ...page1,
        makePR('a2', { title: 'alpha', url: 'https://example.com/a2' }),
        makePR('a3', { title: 'alpha', url: 'https://example.com/a3' }),
        makePR('a4', { title: 'alpha', url: 'https://example.com/a4' }),
      ];
      api = await harness.update((a) => a.setPrs(page2));
      expect(api.keys).toEqual([renovateKey('beta'), renovateKey('alpha')]);
      expect(api.counts).toEqual([2, 4]);
    } finally {
      harness.unmount();
    }
  });

  test('filterKey change resets to strategy-sorted order', async () => {
    const page1 = [
      makePR('a1', { title: 'alpha', url: 'https://example.com/a1' }),
      makePR('a2', { title: 'alpha', url: 'https://example.com/a2' }),
      makePR('b1', { title: 'beta', url: 'https://example.com/b1' }),
    ];
    const harness = createHarness({
      prs: page1,
      filterKey: 'filters-v1',
      sortStrategy: 'count',
    });
    try {
      let api = await harness.render();
      expect(api.keys).toEqual([renovateKey('alpha'), renovateKey('beta')]);

      const page2 = [
        ...page1,
        makePR('z1', { title: 'zeta', url: 'https://example.com/z1' }),
        makePR('z2', { title: 'zeta', url: 'https://example.com/z2' }),
        makePR('z3', { title: 'zeta', url: 'https://example.com/z3' }),
      ];
      api = await harness.update((a) => a.setPrs(page2));
      // Stable (appended) order — not count order.
      expect(api.keys).toEqual([
        renovateKey('alpha'),
        renovateKey('beta'),
        renovateKey('zeta'),
      ]);

      // Changing filterKey (filters / sort in the UI) must re-apply sort strategy.
      api = await harness.update((a) => a.setFilterKey('filters-v2'));
      expect(api.keys).toEqual([
        renovateKey('zeta'),
        renovateKey('alpha'),
        renovateKey('beta'),
      ]);
      expect(api.counts).toEqual([3, 2, 1]);
    } finally {
      harness.unmount();
    }
  });

  test('groups that disappear are dropped; reappearing groups append as new', async () => {
    const all = [
      makePR('a1', { title: 'alpha', url: 'https://example.com/a1' }),
      makePR('b1', { title: 'beta', url: 'https://example.com/b1' }),
      makePR('c1', { title: 'gamma', url: 'https://example.com/c1' }),
    ];
    const harness = createHarness({
      prs: all,
      filterKey: 'drop-1',
      sortStrategy: 'name',
    });
    try {
      let api = await harness.render();
      expect(api.keys).toEqual([
        renovateKey('alpha'),
        renovateKey('beta'),
        renovateKey('gamma'),
      ]);

      // Simulate filtered list without beta.
      api = await harness.update((a) =>
        a.setPrs(all.filter((p) => p.title !== 'beta')),
      );
      expect(api.keys).toEqual([renovateKey('alpha'), renovateKey('gamma')]);

      // Beta returns: treated as a new key and appended (does not reclaim old slot).
      api = await harness.update((a) => a.setPrs(all));
      expect(api.keys).toEqual([
        renovateKey('alpha'),
        renovateKey('gamma'),
        renovateKey('beta'),
      ]);
    } finally {
      harness.unmount();
    }
  });
});

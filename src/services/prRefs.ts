import { APP_ROUTES, MAX_BUNDLE_PRS, URL_SEARCH_PARAMS } from '../constants';
import type { PRRef } from '../types';

const GITHUB_PROVIDER = 'github';
const BUNDLE_PRS_ALIAS = 'prs';
const BUNDLE_DESCRIPTION_ALIAS = 'desc';

export interface PRBundleParams {
  refs: PRRef[];
  invalid: string[];
  title: string;
  description: string;
}

interface ParsedPRRefs {
  refs: PRRef[];
  invalid: string[];
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Parses a comma-separated list of GitHub PR references.
 *
 * Accepted forms, from most to least explicit:
 *   github:owner/repo/123
 *   owner/repo/123
 *   repo/123            (inherits provider and owner from the previous valid ref)
 *
 * The shorthand keeps shared links small when a group spans repos from one owner.
 */
export function parsePRRefs(value: string | null | undefined): ParsedPRRefs {
  const refs: PRRef[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  if (!value) return { refs, invalid };

  let owner = '';

  for (const rawToken of value.split(',')) {
    const token = rawToken.trim();
    if (!token) continue;

    let rest = token;
    const separatorIndex = token.indexOf(':');
    if (separatorIndex !== -1) {
      const provider = token.slice(0, separatorIndex).toLowerCase();
      rest = token.slice(separatorIndex + 1);
      if (provider !== GITHUB_PROVIDER) {
        invalid.push(token);
        continue;
      }
    }

    const parts = rest.split('/');
    if (parts.length !== 2 && parts.length !== 3) {
      invalid.push(token);
      continue;
    }

    const tokenOwner = parts.length === 3 ? parts[0] : owner;
    const repo = parts[parts.length - 2];
    const number = parsePositiveInteger(parts[parts.length - 1]);

    if (!tokenOwner || !repo || number === null) {
      invalid.push(token);
      continue;
    }

    owner = tokenOwner;

    const key = `${tokenOwner}/${repo}#${number}`;
    if (seen.has(key)) continue;

    if (refs.length >= MAX_BUNDLE_PRS) {
      invalid.push(token);
      continue;
    }

    seen.add(key);
    refs.push({ owner: tokenOwner, repo, number });
  }

  return { refs, invalid };
}

/** Serializes refs using the same compact grammar parsePRRefs accepts. */
export function serializePRRefs(refs: PRRef[]): string {
  const tokens: string[] = [];
  const seen = new Set<string>();
  let previousOwner = '';

  for (const ref of refs) {
    const key = `${ref.owner}/${ref.repo}#${ref.number}`;
    if (seen.has(key)) continue;

    seen.add(key);
    tokens.push(
      ref.owner === previousOwner
        ? `${ref.repo}/${ref.number}`
        : `${ref.owner}/${ref.repo}/${ref.number}`,
    );
    previousOwner = ref.owner;

    if (tokens.length >= MAX_BUNDLE_PRS) break;
  }

  if (tokens.length > 0) {
    tokens[0] = `${GITHUB_PROVIDER}:${tokens[0]}`;
  }

  return tokens.join(',');
}

/** Percent-encodes a query value, preferring + for spaces to keep links short. */
function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

/**
 * Builds a shareable bundle link. Ref separators and the provider/owner syntax
 * are left readable instead of percent-encoding `:`, `/`, and `,`.
 */
export function buildBundleUrl(
  refs: PRRef[],
  title = '',
  description = '',
): string {
  const params: string[] = [];
  const serializedRefs = serializePRRefs(refs);

  if (serializedRefs) {
    params.push(`${URL_SEARCH_PARAMS.BUNDLE_PRS}=${serializedRefs}`);
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    params.push(
      `${URL_SEARCH_PARAMS.BUNDLE_TITLE}=${encodeQueryValue(trimmedTitle)}`,
    );
  }

  const trimmedDescription = description.trim();
  if (trimmedDescription) {
    params.push(
      `${URL_SEARCH_PARAMS.BUNDLE_DESCRIPTION}=${encodeQueryValue(trimmedDescription)}`,
    );
  }

  return params.length > 0
    ? `${APP_ROUTES.BUNDLE}?${params.join('&')}`
    : APP_ROUTES.BUNDLE;
}

export function formatPRRef(ref: PRRef): string {
  return `${ref.owner}/${ref.repo}#${ref.number}`;
}

export function parseBundleParams(params: URLSearchParams): PRBundleParams {
  const rawRefs =
    params.get(URL_SEARCH_PARAMS.BUNDLE_PRS) ??
    params.get(BUNDLE_PRS_ALIAS) ??
    '';

  const { refs, invalid } = parsePRRefs(rawRefs);

  return {
    refs,
    invalid,
    title: (params.get(URL_SEARCH_PARAMS.BUNDLE_TITLE) ?? '').trim(),
    description: (
      params.get(URL_SEARCH_PARAMS.BUNDLE_DESCRIPTION) ??
      params.get(BUNDLE_DESCRIPTION_ALIAS) ??
      ''
    ).trim(),
  };
}

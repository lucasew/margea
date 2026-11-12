import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRelayEnvironment } from 'react-relay';
import { AlertCircle, Info, RefreshCw } from 'react-feather';
import type { PRGroup } from '../types';
import {
  fetchPRsByRefs,
  type PRRefFetchResult,
} from '../services/prRefFetcher';
import { formatPRRef, parseBundleParams } from '../services/prRefs';
import { reportError } from '../utils/errorReporting';
import { PRGroupDetail } from './PRGroupDetail';

type BundleState =
  | { status: 'ready'; key: string; result: PRRefFetchResult }
  | { status: 'error'; key: string; error: Error };

function bundleGroup(title: string, result: PRRefFetchResult): PRGroup {
  const labels = [
    ...new Set(
      result.prs.flatMap(
        (pr) => pr.labels?.nodes?.map((label) => label.name) ?? [],
      ),
    ),
  ].sort();

  return {
    key: 'bundle',
    package: title,
    baseRef: result.prs[0]?.baseRefName ?? '',
    labels,
    prs: result.prs,
    count: result.prs.length,
  };
}

function FailedRefsHint({ refs }: { refs: string[] }) {
  const { t } = useTranslation();

  if (refs.length === 0) return null;

  return (
    <div role="alert" className="alert alert-warning mb-4 py-2.5 text-sm">
      <AlertCircle size={18} aria-hidden />
      <div className="min-w-0">
        <span>
          {t('prBundle.failedRefs', { count: refs.length })}{' '}
          <span className="font-mono break-all">{refs.join(', ')}</span>
        </span>
      </div>
    </div>
  );
}

export function PRBundlePage() {
  const { t } = useTranslation();
  const environment = useRelayEnvironment();
  const [searchParams] = useSearchParams();
  const bundle = useMemo(() => parseBundleParams(searchParams), [searchParams]);

  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<BundleState | null>(null);

  const refsKey = bundle.refs
    .map((ref) => `${ref.owner}/${ref.repo}#${ref.number}`)
    .join(',');
  const requestKey = `${reloadKey}:${refsKey}`;

  useEffect(() => {
    if (bundle.refs.length === 0) return;

    let cancelled = false;
    const key = requestKey;

    fetchPRsByRefs(environment, bundle.refs).then(
      (result) => {
        if (cancelled) return;
        for (const failure of result.errors) {
          reportError(failure.error, {
            context: 'fetching PR for shared bundle',
            ref: formatPRRef(failure.ref),
          });
        }
        setState({ status: 'ready', key, result });
      },
      (error: unknown) => {
        if (cancelled) return;
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        reportError(normalized, { context: 'fetching shared bundle' });
        setState({ status: 'error', key, error: normalized });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [bundle.refs, environment, requestKey]);

  const current = state?.key === requestKey ? state : null;
  const title = bundle.title || t('prBundle.defaultTitle');
  const failedRefs =
    current?.status === 'ready'
      ? [
          ...current.result.missing.map(formatPRRef),
          ...current.result.errors.map((failure) => formatPRRef(failure.ref)),
        ]
      : [];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} — Margea`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="app-container py-5 sm:py-6">
      {bundle.invalid.length > 0 && (
        <div role="alert" className="alert alert-warning mb-4 py-2.5 text-sm">
          <AlertCircle size={18} aria-hidden />
          <span>
            {t('prBundle.invalidRefs', { count: bundle.invalid.length })}{' '}
            <span className="font-mono break-all">
              {bundle.invalid.join(', ')}
            </span>
          </span>
        </div>
      )}

      {bundle.refs.length === 0 ? (
        <div role="alert" className="alert alert-info py-2.5 text-sm">
          <Info size={18} aria-hidden />
          <span>{t('prBundle.noRefs')}</span>
        </div>
      ) : current === null ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
          <span className="loading loading-spinner loading-md text-primary" />
          <p className="text-sm text-base-content/60">
            {t('prBundle.loading')}
          </p>
        </div>
      ) : current.status === 'error' ? (
        <div role="alert" className="alert alert-error py-2.5 text-sm">
          <AlertCircle size={18} aria-hidden />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              {t('prBundle.errorTitle')}
            </h3>
            <p className="text-xs opacity-90 break-words">
              {current.error.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="btn btn-ghost btn-sm gap-1.5"
          >
            <RefreshCw size={15} aria-hidden />
            {t('prList.retry')}
          </button>
        </div>
      ) : current.result.prs.length === 0 ? (
        <>
          <FailedRefsHint refs={failedRefs} />
          <div role="alert" className="alert alert-error py-2.5 text-sm">
            <AlertCircle size={18} aria-hidden />
            <span>{t('prBundle.noneLoaded')}</span>
          </div>
        </>
      ) : (
        <>
          <FailedRefsHint refs={failedRefs} />
          <PRGroupDetail
            group={bundleGroup(title, current.result)}
            description={bundle.description || undefined}
          />
        </>
      )}
    </div>
  );
}

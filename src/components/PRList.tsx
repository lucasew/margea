import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useLazyLoadQuery, fetchQuery } from 'react-relay';
import { RefreshCw, Download, Filter, GitPullRequest, GitMerge, XCircle, CheckCircle, Folder, AlertTriangle } from 'react-feather';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { relayEnvironment } from '../relay/environment';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { groupPullRequests, filterPullRequests, calculateStats } from '../services/prGrouping';
import { transformPR } from '../services/prTransformer';
import { PRGroupCard } from './PRGroupCard';
import { PRGroupDetail } from './PRGroupDetail';
import { PRGroup, PullRequest } from '../types';
import { PR_STATES, PRState, PR_STATE_LABELS } from '../constants';

interface PRListContentProps {
  searchQuery: string;
  onRefresh: () => void;
}

function PRListContent({ searchQuery, onRefresh }: PRListContentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const groupKey = searchParams.get('group');

  // Read filters from URL
  const filterRepo = searchParams.get('repo') || '';
  const filterState = (searchParams.get('state') || 'ALL') as PRState;
  const filterAuthor = searchParams.get('author') || '';
  const filterOwner = searchParams.get('owner') || '';

  // State for PR target/goal, synced with URL param
  const [prTarget, setPrTarget] = useState(() => {
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    return limit > 0 && limit <= 1000 ? limit : 100;
  });

  // Persist filters in sessionStorage
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    // Only restore on mount (when isRestored is false)
    if (isRestored) return;

    const storageKey = `margea_filters_${location.pathname}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      const storedParams = new URLSearchParams(stored);
      const newParams = new URLSearchParams(searchParams);
      let hasChanges = false;

      storedParams.forEach((value, key) => {
        // If current params don't have this key, restore it
        if (!newParams.has(key)) {
          newParams.set(key, value);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSearchParams(newParams, { replace: true });
      }
    }

    setIsRestored(true);
  }, [location.pathname, isRestored, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isRestored) return;

    const storageKey = `margea_filters_${location.pathname}`;
    sessionStorage.setItem(storageKey, searchParams.toString());
  }, [searchParams, location.pathname, isRestored]);

  useEffect(() => {
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const validLimit = limit > 0 && limit <= 1000 ? limit : 100;
    setPrTarget(validLimit);
  }, [searchParams]);

  // States for pagination
  const [additionalPRs, setAdditionalPRs] = useState<PullRequest[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Helper to update filters in URL
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Preserve group param if it exists
    if (groupKey) {
      newParams.set('group', groupKey);
    }
    setSearchParams(newParams);
  };

  const handleLimitChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('limit', value);
    setSearchParams(newParams, { replace: true });
  }

  // Always fetch in batches of 100
  const BATCH_SIZE = 100;

  const data = useLazyLoadQuery<SearchPRsQueryType>(
    SearchPRsQuery,
    {
      searchQuery,
      first: Math.min(BATCH_SIZE, prTarget),
    }
  );

  // Update pagination info from initial query and trigger auto-fetch
  useEffect(() => {
    setHasNextPage(data.search.pageInfo?.hasNextPage ?? false);
    setEndCursor(data.search.pageInfo?.endCursor ?? null);
    // Reset additional PRs when query changes
    setAdditionalPRs([]);
    setIsLoadingMore(false);
  }, [data]);

  // Transform Relay data to our PullRequest type
  const initialPRs: PullRequest[] = (data.search.edges || [])
    .map(edge => transformPR(edge?.node))
    .filter((pr): pr is PullRequest => pr !== null);

  // Combine initial PRs with additional PRs from pagination
  const prs: PullRequest[] = [...initialPRs, ...additionalPRs];

  const filteredPrs = filterPullRequests(prs, {
    repository: filterRepo,
    state: filterState,
    author: filterAuthor,
    owner: filterOwner,
  });

  const groups = groupPullRequests(filteredPrs);
  const stats = calculateStats(filteredPrs);

  // Extract unique values for dropdowns from ALL PRs (not filtered)
  const uniqueRepos = Array.from(new Set(prs.map(pr => `${pr.repository.owner.login}/${pr.repository.name}`))).sort();
  const uniqueOwners = Array.from(new Set(prs.map(pr => pr.repository.owner.login))).sort();
  const uniqueAuthors = Array.from(new Set(prs.map(pr => pr.author?.login).filter(Boolean) as string[])).sort();

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(groups, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'margea-pr-groups.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectGroup = (group: PRGroup) => {
    setSearchParams({ group: group.key });
  };

  const handleBackFromGroup = () => {
    navigate(-1);
  };

  const fetchMorePRs = async () => {
    if (!hasNextPage || !endCursor || isLoadingMore) return;

    const currentTotal = initialPRs.length + additionalPRs.length;
    if (currentTotal >= prTarget) return; // Already reached target

    setIsLoadingMore(true);
    try {
      const remainingToFetch = prTarget - currentTotal;
      const batchSize = Math.min(BATCH_SIZE, remainingToFetch);

      const result = await fetchQuery<SearchPRsQueryType>(
        relayEnvironment,
        SearchPRsQuery,
        {
          searchQuery,
          first: batchSize,
          after: endCursor,
        }
      ).toPromise();

      if (result?.search) {
        // Transform new PRs
        const newPRs: PullRequest[] = (result.search.edges || [])
          .map(edge => transformPR(edge?.node))
          .filter((pr): pr is PullRequest => pr !== null);

        setAdditionalPRs(prev => [...prev, ...newPRs]);
        setHasNextPage(result.search.pageInfo?.hasNextPage ?? false);
        setEndCursor(result.search.pageInfo?.endCursor ?? null);
      }
    } catch (error) {
      console.error('Error loading more PRs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto-fetch to reach target
  useEffect(() => {
    const currentTotal = initialPRs.length + additionalPRs.length;
    const shouldFetchMore = hasNextPage && currentTotal < prTarget && !isLoadingMore;

    if (shouldFetchMore) {
      fetchMorePRs();
    }
  }, [initialPRs.length, additionalPRs.length, hasNextPage, prTarget, isLoadingMore, endCursor]);

  // Show group detail if a group is selected via query param
  if (groupKey) {
    const selectedGroup = groups.find(g => g.key === groupKey);
    if (selectedGroup) {
      return <PRGroupDetail group={selectedGroup} onBack={handleBackFromGroup} />;
    }
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Stats */}
        <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full mb-6 bg-base-100">
          <div className="stat place-items-center">
            <div className="stat-figure text-primary">
              <GitPullRequest size={40} />
            </div>
            <div className="stat-title">Total PRs</div>
            <div className="stat-value text-primary">{stats.total}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-figure text-success">
              <CheckCircle size={40} />
            </div>
            <div className="stat-title">Abertos</div>
            <div className="stat-value text-success">{stats.open}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-figure text-info">
              <GitMerge size={40} />
            </div>
            <div className="stat-title">Merged</div>
            <div className="stat-value text-info">{stats.merged}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-figure text-error">
              <XCircle size={40} />
            </div>
            <div className="stat-title">Fechados</div>
            <div className="stat-value text-error">{stats.closed}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-figure text-base-content">
              <Folder size={40} />
            </div>
            <div className="stat-title">Repositórios</div>
            <div className="stat-value">{stats.repositories}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="card bg-base-100 shadow-lg mb-6">
          <div className="card-body">
            <h3 className="card-title mb-4">
              <Filter size={20} />
              Filtros e Ações
            </h3>

            <div className="space-y-4">
              {/* Filtros - Linha 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Repositório</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={filterRepo}
                    onChange={(e) => updateFilter('repo', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {uniqueRepos.map(repo => (
                      <option key={repo} value={repo}>{repo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Owner/Org</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={filterOwner}
                    onChange={(e) => updateFilter('owner', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {uniqueOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Autor</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={filterAuthor}
                    onChange={(e) => updateFilter('author', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {uniqueAuthors.map(author => (
                      <option key={author} value={author}>{author}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={filterState}
                    onChange={(e) => updateFilter('state', e.target.value)}
                  >
                    {PR_STATES.map((state) => (
                      <option key={state} value={state}>
                        {PR_STATE_LABELS[state]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ações - Linha 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Meta de PRs</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={prTarget}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>

                <button onClick={onRefresh} className="btn btn-primary w-full self-end">
                  <RefreshCw size={18} />
                  Atualizar
                </button>

                <button onClick={handleExportJSON} className="btn btn-secondary w-full self-end">
                  <Download size={18} />
                  Exportar JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Grupos de PRs
            <div className="badge badge-lg badge-neutral">{groups.length}</div>
          </h2>
        </div>

        {groups.length === 0 ? (
          <div role="alert" className="alert alert-info shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Nenhum PR encontrado com os filtros aplicados.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups.map((group) => (
                <PRGroupCard key={group.key} group={group} onExpand={handleSelectGroup} />
              ))}
            </div>

            {/* Loading progress indicator */}
            {isLoadingMore && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                  <span className="text-lg">
                    Carregando PRs... {prs.length} de {prTarget}
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-64"
                  value={prs.length}
                  max={prTarget}
                ></progress>
              </div>
            )}

            {/* Info when target reached or no more PRs */}
            {!isLoadingMore && prs.length > 0 && prs.length < prTarget && !hasNextPage && (
              <div className="mt-8 flex justify-center">
                <div className="alert alert-info max-w-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>
                    Carregados {prs.length} PRs (meta: {prTarget}). Não há mais PRs disponíveis.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PRListProps {
  searchQuery: string;
}

function PRListErrorFallback({ error, resetErrorBoundary, onRetry }: FallbackProps & { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <AlertTriangle size={64} className="text-error mb-4" />
              <h2 className="card-title text-2xl mb-2">Erro ao carregar PRs</h2>
              <p className="text-base-content/70 mb-4">
                Não foi possível carregar os Pull Requests do GitHub.
              </p>

              {error && (
                <div className="alert alert-error w-full mb-4">
                  <div className="flex flex-col items-start gap-2 w-full">
                    <span className="font-semibold">Detalhes:</span>
                    <code className="text-sm bg-base-200 p-2 rounded w-full text-left overflow-x-auto">
                      {error.message}
                    </code>
                  </div>
                </div>
              )}

              <div className="alert alert-info w-full mb-4">
                <div className="flex flex-col items-start gap-2 w-full text-left">
                  <span className="font-semibold">Possíveis causas:</span>
                  <ul className="text-sm list-disc list-inside">
                    <li>Token de autenticação inválido ou expirado</li>
                    <li>Limite de requisições da API do GitHub excedido</li>
                    <li>Problemas de conectividade com a internet</li>
                    <li>Parâmetros de busca inválidos</li>
                  </ul>
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => {
                    resetErrorBoundary();
                    onRetry();
                  }}
                  className="btn btn-primary"
                >
                  <RefreshCw size={18} />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      );
}

export function PRList({ searchQuery }: PRListProps) {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const logError = (error: Error, info: { componentStack?: string | null }) => {
    console.error('PR List error:', error, info);
  };

  return (
    <ReactErrorBoundary
        FallbackComponent={(props) => <PRListErrorFallback {...props} onRetry={handleRefresh} />}
        onError={logError}
        onReset={() => {
            // Optional: any cleanup or state reset needed when boundary resets
        }}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-lg text-base-content/70">Carregando Pull Requests...</p>
          </div>
        }
      >
        <PRListContent key={key} searchQuery={searchQuery} onRefresh={handleRefresh} />
      </Suspense>
    </ReactErrorBoundary>
  );
}

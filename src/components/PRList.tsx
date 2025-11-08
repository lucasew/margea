import { Suspense, useState } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import { RefreshCw, Download, Filter, GitPullRequest, GitMerge, XCircle, CheckCircle, Folder } from 'react-feather';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { groupPullRequests, filterPullRequests, calculateStats } from '../services/prGrouping';
import { PRGroupCard } from './PRGroupCard';
import { PRGroupDetail } from './PRGroupDetail';
import { PRGroup, PullRequest } from '../types';

interface PRListContentProps {
  searchQuery: string;
  onRefresh: () => void;
}

function PRListContent({ searchQuery, onRefresh }: PRListContentProps) {
  const [selectedGroup, setSelectedGroup] = useState<PRGroup | null>(null);
  const [filterRepo, setFilterRepo] = useState('');
  const [filterState, setFilterState] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'MERGED'>('ALL');

  const data = useLazyLoadQuery<SearchPRsQueryType>(
    SearchPRsQuery,
    {
      searchQuery,
      first: 100,
    },
    { fetchPolicy: 'network-only' }
  );

  // Transform Relay data to our PullRequest type
  const prs: PullRequest[] = (data.search.edges || [])
    .map(edge => edge?.node)
    .filter((node): node is NonNullable<typeof node> =>
      node != null &&
      node.id != null &&
      node.number != null &&
      node.title != null &&
      node.state != null &&
      node.createdAt != null &&
      node.updatedAt != null &&
      node.url != null &&
      node.baseRefName != null &&
      node.headRefName != null &&
      node.repository != null
    )
    .map(pr => ({
      id: pr.id!,
      number: pr.number!,
      title: pr.title!,
      body: pr.body ?? null,
      state: pr.state as 'OPEN' | 'CLOSED' | 'MERGED',
      createdAt: pr.createdAt!,
      updatedAt: pr.updatedAt!,
      mergedAt: pr.mergedAt ?? null,
      closedAt: pr.closedAt ?? null,
      url: pr.url!,
      baseRefName: pr.baseRefName!,
      headRefName: pr.headRefName!,
      author: pr.author ? {
        login: pr.author.login,
        avatarUrl: pr.author.avatarUrl,
      } : null,
      labels: pr.labels ? {
        nodes: (pr.labels.nodes || [])
          .filter((node): node is NonNullable<typeof node> => node != null)
          .map(node => ({
            id: node.id,
            name: node.name,
            color: node.color,
            description: node.description ?? null,
          })),
      } : null,
      repository: pr.repository!,
    }));

  const filteredPrs = filterPullRequests(prs, {
    repository: filterRepo,
    state: filterState,
  });

  const groups = groupPullRequests(filteredPrs);
  const stats = calculateStats(filteredPrs);

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

  if (selectedGroup) {
    return <PRGroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="form-control lg:col-span-5">
                <label className="label">
                  <span className="label-text font-semibold">Filtrar por repositório</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: owner/repo"
                  className="input input-bordered w-full"
                  value={filterRepo}
                  onChange={(e) => setFilterRepo(e.target.value)}
                />
              </div>

              <div className="form-control lg:col-span-3">
                <label className="label">
                  <span className="label-text font-semibold">Status</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value as any)}
                >
                  <option value="ALL">Todos</option>
                  <option value="OPEN">Abertos</option>
                  <option value="MERGED">Merged</option>
                  <option value="CLOSED">Fechados</option>
                </select>
              </div>

              <div className="form-control lg:col-span-4">
                <label className="label">
                  <span className="label-text opacity-0">Ações</span>
                </label>
                <div className="join w-full">
                  <button onClick={onRefresh} className="btn btn-primary join-item flex-1">
                    <RefreshCw size={18} />
                    Atualizar
                  </button>

                  <button onClick={handleExportJSON} className="btn btn-secondary join-item flex-1">
                    <Download size={18} />
                    Exportar
                  </button>
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map((group) => (
              <PRGroupCard key={group.key} group={group} onExpand={setSelectedGroup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PRListProps {
  searchQuery: string;
}

export function PRList({ searchQuery }: PRListProps) {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  return (
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
  );
}

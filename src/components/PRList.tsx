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
    <div className="container mx-auto p-4">
      {/* Stats */}
      <div className="stats shadow w-full mb-6 grid grid-cols-2 md:grid-cols-5">
        <div className="stat">
          <div className="stat-figure text-primary">
            <GitPullRequest size={32} />
          </div>
          <div className="stat-title">Total PRs</div>
          <div className="stat-value text-primary">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle size={32} />
          </div>
          <div className="stat-title">Abertos</div>
          <div className="stat-value text-success">{stats.open}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info">
            <GitMerge size={32} />
          </div>
          <div className="stat-title">Merged</div>
          <div className="stat-value text-info">{stats.merged}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-error">
            <XCircle size={32} />
          </div>
          <div className="stat-title">Fechados</div>
          <div className="stat-value text-error">{stats.closed}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-base-content">
            <Folder size={32} />
          </div>
          <div className="stat-title">Repositórios</div>
          <div className="stat-value">{stats.repositories}</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter size={20} />
            Filtros e Ações
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="form-control flex-1 min-w-[200px]">
              <label className="label">
                <span className="label-text">Filtrar por repositório</span>
              </label>
              <input
                type="text"
                placeholder="ex: owner/repo"
                className="input input-bordered"
                value={filterRepo}
                onChange={(e) => setFilterRepo(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Status</span>
              </label>
              <select
                className="select select-bordered"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value as any)}
              >
                <option value="ALL">Todos</option>
                <option value="OPEN">Abertos</option>
                <option value="MERGED">Merged</option>
                <option value="CLOSED">Fechados</option>
              </select>
            </div>

            <div className="form-control self-end">
              <button onClick={onRefresh} className="btn btn-primary gap-2">
                <RefreshCw size={18} />
                Atualizar
              </button>
            </div>

            <div className="form-control self-end">
              <button onClick={handleExportJSON} className="btn btn-secondary gap-2">
                <Download size={18} />
                Exportar JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Grupos de PRs ({groups.length})</h2>
      </div>

      {groups.length === 0 ? (
        <div className="alert alert-info">
          <span>Nenhum PR encontrado com os filtros aplicados.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <PRGroupCard key={group.key} group={group} onExpand={setSelectedGroup} />
          ))}
        </div>
      )}
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      }
    >
      <PRListContent key={key} searchQuery={searchQuery} onRefresh={handleRefresh} />
    </Suspense>
  );
}

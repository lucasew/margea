import { RefreshCw, Download, Filter } from 'react-feather';
import { PR_STATES, PR_STATE_LABELS, MAX_PR_TARGET } from '../constants';
import { PRState } from '../types';

interface PRFiltersProps {
  filterRepo: string;
  filterOwner: string;
  filterAuthor: string;
  filterState: PRState;
  prTarget: number;
  uniqueRepos: string[];
  uniqueOwners: string[];
  uniqueAuthors: string[];
  updateFilter: (key: string, value: string) => void;
  handleLimitChange: (value: string) => void;
  onRefresh: () => void;
  onExportJSON: () => void;
}

export function PRFilters({
  filterRepo,
  filterOwner,
  filterAuthor,
  filterState,
  prTarget,
  uniqueRepos,
  uniqueOwners,
  uniqueAuthors,
  updateFilter,
  handleLimitChange,
  onRefresh,
  onExportJSON,
}: PRFiltersProps) {
  return (
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
                max={MAX_PR_TARGET}
                value={prTarget}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>

            <button onClick={onRefresh} className="btn btn-primary w-full self-end">
              <RefreshCw size={18} />
              Atualizar
            </button>

            <button onClick={onExportJSON} className="btn btn-secondary w-full self-end">
              <Download size={18} />
              Exportar JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

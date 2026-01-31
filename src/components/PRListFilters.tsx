import { Filter, RefreshCw, Download } from 'react-feather';
import { FilterDropdown } from './FilterDropdown';
import {
  PR_STATES,
  PR_STATE_LABELS,
  URL_SEARCH_PARAMS,
  PRState,
} from '../constants';

interface PRListFiltersProps {
  filterRepo: string;
  filterOwner: string;
  filterAuthor: string;
  filterState: PRState;
  uniqueRepos: string[];
  uniqueOwners: string[];
  uniqueAuthors: string[];
  onRefresh: () => void;
  onExportJSON: () => void;
  updateFilter: (key: string, value: string) => void;
}

export function PRListFilters({
  filterRepo,
  filterOwner,
  filterAuthor,
  filterState,
  uniqueRepos,
  uniqueOwners,
  uniqueAuthors,
  onRefresh,
  onExportJSON,
  updateFilter,
}: PRListFiltersProps) {
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
            <FilterDropdown
              label="Repositório"
              value={filterRepo}
              onChange={(value) => updateFilter(URL_SEARCH_PARAMS.REPO, value)}
              options={uniqueRepos}
            />

            <FilterDropdown
              label="Owner/Org"
              value={filterOwner}
              onChange={(value) => updateFilter(URL_SEARCH_PARAMS.OWNER, value)}
              options={uniqueOwners}
            />

            <FilterDropdown
              label="Autor"
              value={filterAuthor}
              onChange={(value) =>
                updateFilter(URL_SEARCH_PARAMS.AUTHOR, value)
              }
              options={uniqueAuthors}
            />

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Status</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filterState}
                onChange={(e) =>
                  updateFilter(URL_SEARCH_PARAMS.STATE, e.target.value)
                }
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
          <div className="flex flex-row gap-4 justify-end">
            <button onClick={onRefresh} className="btn btn-primary">
              <RefreshCw size={18} />
              Atualizar
            </button>

            <button onClick={onExportJSON} className="btn btn-secondary">
              <Download size={18} />
              Exportar JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

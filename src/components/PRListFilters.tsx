import { Filter, RefreshCw, Download } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { FilterDropdown } from './FilterDropdown';
import {
  PR_STATES,
  URL_SEARCH_PARAMS,
  PRState,
  GROUPING_STRATEGIES,
} from '../constants';
import { GroupingStrategy } from '../types';

interface PRListFiltersProps {
  filterRepo: string;
  filterOwner: string;
  filterAuthor: string;
  filterState: PRState;
  groupBy: GroupingStrategy;
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
  groupBy,
  uniqueRepos,
  uniqueOwners,
  uniqueAuthors,
  onRefresh,
  onExportJSON,
  updateFilter,
}: PRListFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="card bg-base-100 shadow-lg mb-6">
      <div className="card-body">
        <h3 className="card-title mb-4">
          <Filter size={20} />
          {t('filters.title')}
        </h3>

        <div className="space-y-4">
          {/* Filtros - Linha 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterDropdown
              label={t('filters.repository')}
              value={filterRepo}
              onChange={(value) => updateFilter(URL_SEARCH_PARAMS.REPO, value)}
              options={uniqueRepos}
              allLabel={t('common.all')}
            />

            <FilterDropdown
              label={t('filters.ownerOrg')}
              value={filterOwner}
              onChange={(value) => updateFilter(URL_SEARCH_PARAMS.OWNER, value)}
              options={uniqueOwners}
              allLabel={t('common.all')}
            />

            <FilterDropdown
              label={t('filters.author')}
              value={filterAuthor}
              onChange={(value) =>
                updateFilter(URL_SEARCH_PARAMS.AUTHOR, value)
              }
              options={uniqueAuthors}
              allLabel={t('common.all')}
            />

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  {t('filters.status')}
                </span>
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
                    {t(`prStates.${state}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros - Linha 2 (Agrupamento) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  {t('filters.groupBy')}
                </span>
              </label>
              <select
                className="select select-bordered w-full"
                value={groupBy}
                onChange={(e) =>
                  updateFilter(URL_SEARCH_PARAMS.GROUP_BY, e.target.value)
                }
              >
                {Object.keys(GROUPING_STRATEGIES).map((key) => (
                  <option key={key} value={key}>
                    {t(`grouping.${key}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ações - Linha 3 */}
          <div className="flex flex-row gap-4 justify-end">
            <button onClick={onRefresh} className="btn btn-primary">
              <RefreshCw size={18} />
              {t('filters.refresh')}
            </button>

            <button onClick={onExportJSON} className="btn btn-secondary">
              <Download size={18} />
              {t('filters.exportJSON')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { RefreshCw, Download } from 'react-feather';
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
    <div className="app-toolbar p-3 sm:p-4 mb-5">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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
            onChange={(value) => updateFilter(URL_SEARCH_PARAMS.AUTHOR, value)}
            options={uniqueAuthors}
            allLabel={t('common.all')}
          />

          <div className="form-control">
            <label className="label py-0.5 min-h-0">
              <span className="label-text text-xs font-medium text-base-content/70">
                {t('filters.status')}
              </span>
            </label>
            <select
              className="select select-bordered select-sm w-full"
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

          <div className="form-control">
            <label className="label py-0.5 min-h-0">
              <span className="label-text text-xs font-medium text-base-content/70">
                {t('filters.groupBy')}
              </span>
            </label>
            <select
              className="select select-bordered select-sm w-full"
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

        <div className="flex flex-row gap-2 justify-end">
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-primary btn-sm gap-1.5"
          >
            <RefreshCw size={15} aria-hidden />
            {t('filters.refresh')}
          </button>

          <button
            type="button"
            onClick={onExportJSON}
            className="btn btn-ghost btn-sm gap-1.5 border border-base-300"
          >
            <Download size={15} aria-hidden />
            {t('filters.exportJSON')}
          </button>
        </div>
      </div>
    </div>
  );
}

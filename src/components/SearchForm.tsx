import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useViewer } from '../hooks/useViewer';

interface SearchFormProps {
  isAuthenticated: boolean;
}

function SearchFormContent({ isAuthenticated }: SearchFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchConfig, setSearchConfig] = useState({
    owner: '',
    repo: '',
    limit: 100,
  });

  // Load organizations only if authenticated
  let organizations: Array<{ login: string; name: string | null | undefined }> = [];
  if (isAuthenticated) {
    try {
      const { organizations: orgs } = useViewer();
      organizations = orgs;
    } catch {
      // If query fails, just use empty list
    }
  }

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();

    const limitParam = searchConfig.limit !== 100 ? `?limit=${searchConfig.limit}` : '';

    if (searchConfig.owner && searchConfig.repo) {
      navigate(`/${encodeURIComponent(searchConfig.owner)}/${encodeURIComponent(searchConfig.repo)}${limitParam}`);
    } else if (searchConfig.owner) {
      navigate(`/org/${encodeURIComponent(searchConfig.owner)}${limitParam}`);
    } else {
      navigate(`/orgs${limitParam}`);
    }
  };

  return (
    <form onSubmit={handleConfigure} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">{t('search.owner_organization')}</span>
        </label>
        {isAuthenticated && organizations.length > 0 ? (
          <select
            className="select select-bordered w-full"
            value={searchConfig.owner}
            onChange={(e) =>
              setSearchConfig({ ...searchConfig, owner: e.target.value })
            }
          >
            <option value="">{t('search.all_organizations')}</option>
            {organizations.map((org) => (
              <option key={org.login} value={org.login}>
                {org.name || org.login}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="ex: facebook"
            className="input input-bordered w-full"
            value={searchConfig.owner}
            onChange={(e) =>
              setSearchConfig({ ...searchConfig, owner: e.target.value })
            }
          />
        )}
        <label className="label">
          <span className="label-text-alt">
            {isAuthenticated
              ? t('search.leave_blank_all_orgs')
              : t('search.leave_blank_all_public_orgs')}
          </span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">{t('search.repository')}</span>
        </label>
        <input
          type="text"
          placeholder="ex: react"
          className="input input-bordered w-full"
          value={searchConfig.repo}
          onChange={(e) =>
            setSearchConfig({ ...searchConfig, repo: e.target.value })
          }
          disabled={!searchConfig.owner}
        />
        <label className="label">
          <span className="label-text-alt">
            {t('search.optional_specify_repository')}
          </span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">{t('search.prsGoal')}</span>
        </label>
        <input
          type="number"
          min="1"
          max="1000"
          placeholder="100"
          className="input input-bordered w-full"
          value={searchConfig.limit}
          onChange={(e) =>
            setSearchConfig({ ...searchConfig, limit: parseInt(e.target.value) || 100 })
          }
        />
        <label className="label">
          <span className="label-text-alt">
            {t('search.prsGoalDescription')}
          </span>
        </label>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="btn btn-primary w-full gap-2 btn-lg"
          disabled={!isAuthenticated}
        >
          <Search size={20} />
          {isAuthenticated ? t('search.search_pull_requests') : t('search.login_required')}
        </button>
      </div>
    </form>
  );
}

export function SearchForm({ isAuthenticated }: SearchFormProps) {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <form className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">{t('search.owner_organization')}</span>
            </label>
            <div className="skeleton h-12 w-full"></div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">{t('search.repository')}</span>
            </label>
            <div className="skeleton h-12 w-full"></div>
          </div>
        </form>
      }
    >
      <SearchFormContent isAuthenticated={isAuthenticated} />
    </Suspense>
  );
}

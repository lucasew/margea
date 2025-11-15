import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'react-feather';
import { useViewer } from '../hooks/useViewer';

interface SearchFormProps {
  isAuthenticated: boolean;
}

function SearchFormContent({ isAuthenticated }: SearchFormProps) {
  const navigate = useNavigate();
  const [searchConfig, setSearchConfig] = useState({
    author: '',
    owner: '',
    repo: '',
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

    // Build URL with author as query parameter
    const authorParam = searchConfig.author ? `?author=${encodeURIComponent(searchConfig.author)}` : '';

    if (searchConfig.owner && searchConfig.repo) {
      navigate(`/${encodeURIComponent(searchConfig.owner)}/${encodeURIComponent(searchConfig.repo)}${authorParam}`);
    } else if (searchConfig.owner) {
      navigate(`/org/${encodeURIComponent(searchConfig.owner)}${authorParam}`);
    } else {
      navigate(`/orgs${authorParam}`);
    }
  };

  return (
    <form onSubmit={handleConfigure} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Autor</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={searchConfig.author}
          onChange={(e) =>
            setSearchConfig({ ...searchConfig, author: e.target.value })
          }
        >
          <option value="">Todos os autores</option>
          <option value="renovate[bot]">renovate[bot]</option>
          <option value="dependabot[bot]">dependabot[bot]</option>
          <option value="github-actions[bot]">github-actions[bot]</option>
        </select>
        <label className="label">
          <span className="label-text-alt">Selecione o autor dos PRs ou deixe vazio para todos</span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Owner/Organização</span>
        </label>
        {isAuthenticated && organizations.length > 0 ? (
          <select
            className="select select-bordered w-full"
            value={searchConfig.owner}
            onChange={(e) =>
              setSearchConfig({ ...searchConfig, owner: e.target.value })
            }
          >
            <option value="">Todas as organizações</option>
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
            Opcional: deixe vazio para buscar em todas as organizações
          </span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Repositório</span>
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
            Opcional: especifique um repositório específico
          </span>
        </label>
      </div>

      <div className="pt-4">
        <button type="submit" className="btn btn-primary w-full gap-2 btn-lg">
          <Search size={20} />
          Buscar Pull Requests
        </button>
      </div>
    </form>
  );
}

export function SearchForm({ isAuthenticated }: SearchFormProps) {
  return (
    <Suspense
      fallback={
        <form className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Autor</span>
            </label>
            <div className="skeleton h-12 w-full"></div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Owner/Organização</span>
            </label>
            <div className="skeleton h-12 w-full"></div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Repositório</span>
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

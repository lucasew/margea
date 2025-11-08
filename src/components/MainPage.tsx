import { useState } from 'react';
import { AlertCircle } from 'react-feather';
import { Header } from './Header';
import { Footer } from './Footer';
import { PRList } from './PRList';

interface MainPageProps {
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean;
}

export function MainPage({ onLogout, onLogin, isAuthenticated }: MainPageProps) {
  const [searchConfig, setSearchConfig] = useState({
    author: 'renovate[bot]',
    owner: '',
    repo: '',
  });
  const [isConfigured, setIsConfigured] = useState(false);

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfigured(true);
  };

  // Build GitHub search query
  const buildSearchQuery = () => {
    const parts = [`is:pr author:${searchConfig.author}`];

    if (searchConfig.owner && searchConfig.repo) {
      parts.push(`repo:${searchConfig.owner}/${searchConfig.repo}`);
    } else if (searchConfig.owner) {
      parts.push(`org:${searchConfig.owner}`);
    }

    return parts.join(' ');
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />
        <main className="flex-1 flex items-center justify-center bg-base-200 p-4">
          <div className="card w-full max-w-md bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl">Configurar Busca</h2>
              <p className="text-base-content/70 mb-4">
                Configure os parâmetros para buscar PRs do Renovate
              </p>

              <form onSubmit={handleConfigure}>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Autor (bot)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="renovate[bot]"
                    className="input input-bordered"
                    value={searchConfig.author}
                    onChange={(e) => setSearchConfig({ ...searchConfig, author: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text">Owner/Organização (opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: facebook"
                    className="input input-bordered"
                    value={searchConfig.owner}
                    onChange={(e) => setSearchConfig({ ...searchConfig, owner: e.target.value })}
                  />
                  <label className="label">
                    <span className="label-text-alt">Deixe vazio para buscar em todos os seus repositórios</span>
                  </label>
                </div>

                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text">Repositório específico (opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: react"
                    className="input input-bordered"
                    value={searchConfig.repo}
                    onChange={(e) => setSearchConfig({ ...searchConfig, repo: e.target.value })}
                    disabled={!searchConfig.owner}
                  />
                  <label className="label">
                    <span className="label-text-alt">Requer owner/organização</span>
                  </label>
                </div>

                <div className="card-actions justify-end mt-6">
                  <button type="submit" className="btn btn-primary w-full">
                    Buscar PRs
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

      {!isAuthenticated && (
        <div className="bg-warning/10 border-b border-warning/30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 text-warning-content">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Modo não autenticado</p>
                <p className="text-xs opacity-80">
                  Você está usando a API do GitHub sem autenticação. Limite de 60 requisições/hora.
                  <button
                    onClick={onLogin}
                    className="ml-2 underline hover:no-underline font-semibold"
                  >
                    Fazer login
                  </button>
                  {' '}para aumentar para 5000 req/hora.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <PRList searchQuery={buildSearchQuery()} />
      </main>
      <Footer />
    </div>
  );
}

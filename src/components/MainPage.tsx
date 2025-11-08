import { useState } from 'react';
import { AlertCircle, Search, User, GitBranch } from 'react-feather';
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
      <div className="min-h-screen flex flex-col bg-base-200 overflow-x-hidden">
        <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

        <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-primary text-primary-content rounded-full w-20 h-20 flex items-center justify-center">
                <div className="w-10 h-10">
                  <Search size={40} />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Encontre seus Pull Requests
            </h1>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Configure sua busca e descubra Pull Requests do Renovate Bot agrupados de forma inteligente
            </p>
          </div>

          {/* Form Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">Configurar Busca</h2>

              <form onSubmit={handleConfigure} className="space-y-4">
                {/* Author Field */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <span className="w-4 h-4 text-primary flex-shrink-0">
                        <User size={16} className="text-primary" />
                      </span>
                      Autor (bot)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="renovate[bot]"
                    className="input input-bordered w-full"
                    value={searchConfig.author}
                    onChange={(e) => setSearchConfig({ ...searchConfig, author: e.target.value })}
                    required
                  />
                </div>

                {/* Owner Field */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <span className="w-4 h-4 text-primary flex-shrink-0">
                        <GitBranch size={16} className="text-primary" />
                      </span>
                      Owner/Organização
                      <span className="badge badge-sm">opcional</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: facebook"
                    className="input input-bordered w-full"
                    value={searchConfig.owner}
                    onChange={(e) => setSearchConfig({ ...searchConfig, owner: e.target.value })}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      Deixe vazio para buscar em todos os seus repositórios
                    </span>
                  </label>
                </div>

                {/* Repository Field */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <span className="w-4 h-4 text-primary flex-shrink-0">
                        <GitBranch size={16} className="text-primary" />
                      </span>
                      Repositório específico
                      <span className="badge badge-sm">opcional</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: react"
                    className="input input-bordered w-full"
                    value={searchConfig.repo}
                    onChange={(e) => setSearchConfig({ ...searchConfig, repo: e.target.value })}
                    disabled={!searchConfig.owner}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      Requer owner/organização
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="card-actions justify-end mt-6">
                  <button type="submit" className="btn btn-primary w-full gap-2">
                    <span className="w-5 h-5 flex-shrink-0">
                      <Search size={20} />
                    </span>
                    Buscar Pull Requests
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Info Alert */}
          <div className="alert mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-bold">Busca Inteligente</h3>
              <div className="text-xs">Encontre e agrupe PRs automaticamente por pacote, versão e branch base</div>
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
              <span className="w-5 h-5 flex-shrink-0">
                <AlertCircle size={20} className="flex-shrink-0" />
              </span>
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

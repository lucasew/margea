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
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-base-200 via-base-100 to-base-200">
        <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-2xl">
            {/* Hero Section */}
            <div className="text-center mb-8 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                <Search className="text-primary" size={32} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-base-content">
                Configurar Busca de PRs
              </h2>
              <p className="text-base-content/70 text-lg max-w-xl mx-auto">
                Configure os parâmetros para encontrar e agrupar Pull Requests do Renovate Bot
              </p>
            </div>

            {/* Form Card */}
            <div className="card bg-base-100 shadow-2xl border border-base-300">
              <div className="card-body p-6 md:p-8">
                <form onSubmit={handleConfigure} className="space-y-6">
                  {/* Author Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        Autor (bot)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="renovate[bot]"
                      className="input input-bordered input-lg focus:input-primary"
                      value={searchConfig.author}
                      onChange={(e) => setSearchConfig({ ...searchConfig, author: e.target.value })}
                      required
                    />
                  </div>

                  {/* Owner Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <GitBranch size={16} className="text-primary" />
                        Owner/Organização
                        <span className="badge badge-sm badge-ghost">opcional</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="ex: facebook"
                      className="input input-bordered input-lg focus:input-primary"
                      value={searchConfig.owner}
                      onChange={(e) => setSearchConfig({ ...searchConfig, owner: e.target.value })}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Deixe vazio para buscar em todos os seus repositórios
                      </span>
                    </label>
                  </div>

                  {/* Repository Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <GitBranch size={16} className="text-primary" />
                        Repositório específico
                        <span className="badge badge-sm badge-ghost">opcional</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="ex: react"
                      className="input input-bordered input-lg focus:input-primary disabled:bg-base-200"
                      value={searchConfig.repo}
                      onChange={(e) => setSearchConfig({ ...searchConfig, repo: e.target.value })}
                      disabled={!searchConfig.owner}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Requer owner/organização
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button type="submit" className="btn btn-primary btn-lg w-full gap-2 shadow-lg">
                      <Search size={20} />
                      Buscar Pull Requests
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="card bg-base-100/50 backdrop-blur border border-base-300/50">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm">Busca Inteligente</h3>
                  <p className="text-xs text-base-content/70">
                    Encontre e agrupe PRs por pacote, versão e branch base
                  </p>
                </div>
              </div>
              <div className="card bg-base-100/50 backdrop-blur border border-base-300/50">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm">Análise Completa</h3>
                  <p className="text-xs text-base-content/70">
                    Visualize estatísticas e detalhes de cada grupo de PRs
                  </p>
                </div>
              </div>
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

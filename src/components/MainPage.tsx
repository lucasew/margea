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
  const [searchQuery, setSearchQuery] = useState('');

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = [`is:pr author:${searchConfig.author}`];

    if (searchConfig.owner && searchConfig.repo) {
      parts.push(`repo:${searchConfig.owner}/${searchConfig.repo}`);
    } else if (searchConfig.owner) {
      parts.push(`org:${searchConfig.owner}`);
    }

    setSearchQuery(parts.join(' '));
  };

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
                  </button>{' '}
                  para aumentar para 5000 req/hora.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <div className="md:col-span-1 lg:col-span-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-6">Configurar Busca</h2>

                <form onSubmit={handleConfigure} className="space-y-4">
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
                      className="input input-bordered w-full"
                      value={searchConfig.author}
                      onChange={(e) =>
                        setSearchConfig({ ...searchConfig, author: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Owner Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <GitBranch size={16} className="text-primary" />
                        Owner/Organização
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="ex: facebook"
                      className="input input-bordered w-full"
                      value={searchConfig.owner}
                      onChange={(e) =>
                        setSearchConfig({ ...searchConfig, owner: e.target.value })
                      }
                    />
                  </div>

                  {/* Repository Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <GitBranch size={16} className="text-primary" />
                        Repositório
                      </span>
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
                  </div>

                  {/* Submit Button */}
                  <div className="card-actions justify-end mt-6">
                    <button type="submit" className="btn btn-primary w-full gap-2">
                      <Search size={20} />
                      Buscar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            {searchQuery ? (
              <PRList searchQuery={searchQuery} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-base-content/50">
                <div className="mb-4">
                  <Search size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nenhuma busca realizada</h2>
                <p>Configure os parâmetros à esquerda e clique em "Buscar".</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

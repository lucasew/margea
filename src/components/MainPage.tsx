import { useState } from 'react';
import { Search } from 'react-feather';
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
    <div className="min-h-screen flex flex-col bg-base-200">
      <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">Margea</h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto mt-4">
            Encontre e agrupe Pull Requests do Renovate Bot de forma inteligente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Busca</h2>
                <form onSubmit={handleConfigure} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Autor</span>
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

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Owner/Organização</span>
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
                  </div>

                  <div className="card-actions justify-end pt-4">
                    <button type="submit" className="btn btn-primary w-full gap-2">
                      <Search size={18} />
                      Buscar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9">
            {searchQuery ? (
              <PRList searchQuery={searchQuery} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full rounded-lg bg-base-100 border border-base-300 p-8 text-center">
                <div className="text-primary mb-4">
                  <Search size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Realize uma busca</h2>
                <p className="text-base-content/70">
                  Utilize o formulário à esquerda para encontrar os Pull Requests.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

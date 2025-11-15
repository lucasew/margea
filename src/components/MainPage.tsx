import { useState, useEffect } from 'react';
import { Search } from 'react-feather';
import { Header } from './Header';
import { Footer } from './Footer';
import { PRList } from './PRList';
import { useRouter, routeToSearchQuery } from '../router';

interface MainPageProps {
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean;
}

export function MainPage({ onLogout, onLogin, isAuthenticated }: MainPageProps) {
  const { currentRoute, navigate } = useRouter();
  const [searchConfig, setSearchConfig] = useState({
    author: 'renovate[bot]',
    owner: '',
    repo: '',
  });

  // Get search query from current route
  const searchQuery = routeToSearchQuery(currentRoute);

  // Update form fields when route changes
  useEffect(() => {
    if (currentRoute.type === 'org') {
      setSearchConfig(prev => ({ ...prev, owner: currentRoute.orgName, repo: '' }));
    } else if (currentRoute.type === 'repo') {
      setSearchConfig(prev => ({
        ...prev,
        owner: currentRoute.orgName,
        repo: currentRoute.repoName
      }));
    } else if (currentRoute.type === 'orgs') {
      setSearchConfig(prev => ({ ...prev, owner: '', repo: '' }));
    } else if (currentRoute.type === 'home') {
      setSearchConfig(prev => ({ ...prev, owner: '', repo: '' }));
    }
  }, [currentRoute]);

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchConfig.owner && searchConfig.repo) {
      navigate({
        type: 'repo',
        orgName: searchConfig.owner,
        repoName: searchConfig.repo
      });
    } else if (searchConfig.owner) {
      navigate({ type: 'org', orgName: searchConfig.owner });
    } else {
      navigate({ type: 'orgs' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">Margea</h1>
          <p className="text-xl md:text-2xl text-base-content/70 max-w-3xl leading-relaxed">
            Encontre e agrupe Pull Requests do Renovate Bot de forma inteligente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-base-300 pb-3">Busca</h2>
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

                  <div className="pt-4">
                    <button type="submit" className="btn btn-primary w-full gap-2">
                      <Search size={18} />
                      Buscar
                    </button>
                  </div>
                </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            {searchQuery ? (
              <PRList searchQuery={searchQuery} currentRoute={currentRoute} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] p-12 text-center">
                <div className="text-primary/50 mb-6">
                  <Search size={64} />
                </div>
                <h2 className="text-3xl font-bold mb-3">Realize uma busca</h2>
                <p className="text-lg text-base-content/60 max-w-md">
                  Utilize o formulário ao lado para encontrar os Pull Requests.
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

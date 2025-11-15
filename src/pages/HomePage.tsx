import { LogIn } from 'react-feather';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { SearchForm } from '../components/SearchForm';

interface HomePageProps {
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean;
}

export function HomePage({ onLogout, onLogin, isAuthenticated }: HomePageProps) {

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Margea</h1>
            <p className="text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto">
              Encontre e agrupe Pull Requests de forma inteligente.
            </p>
          </div>

          {/* Login prompt if not authenticated */}
          {!isAuthenticated && (
            <div className="alert alert-info mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div className="flex-1">
                <span>Faça login para uma melhor experiência e evitar limites de taxa da API.</span>
              </div>
              <button onClick={onLogin} className="btn btn-sm btn-primary gap-2">
                <LogIn size={16} />
                Login
              </button>
            </div>
          )}

          {/* Search Form */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Buscar Pull Requests</h2>
              <SearchForm isAuthenticated={isAuthenticated} />
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="font-semibold mb-2">Agrupamento Inteligente</h3>
                <p className="text-sm text-base-content/70">
                  PRs são automaticamente agrupados por dependência e tipo de atualização.
                </p>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="font-semibold mb-2">Exportação Fácil</h3>
                <p className="text-sm text-base-content/70">
                  Exporte os grupos de PRs em formato JSON para análise posterior.
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

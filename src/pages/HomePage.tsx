import { LogIn } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { SearchForm } from '../components/SearchForm';
import { useMainLayoutContext } from '../hooks/useMainLayoutContext';

export function HomePage() {
  const {
    onLogout,
    onLogin,
    onChangePermissions,
    isAuthenticated,
    currentMode,
  } = useMainLayoutContext();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header
        onLogout={onLogout}
        onLogin={onLogin}
        onChangePermissions={onChangePermissions}
        isAuthenticated={isAuthenticated}
        currentMode={currentMode}
      />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t('homepage.title')}
            </h1>
            <p className="text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto">
              {t('homepage.subtitle')}
            </p>
          </div>

          {/* Login prompt if not authenticated */}
          {!isAuthenticated && (
            <div className="alert alert-info mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div className="flex-1">
                <span>{t('homepage.login_prompt')}</span>
              </div>
              <button
                onClick={onLogin}
                className="btn btn-sm btn-primary gap-2"
              >
                <LogIn size={16} />
                {t('header.login')}
              </button>
            </div>
          )}

          {/* Search Form */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">{t('search.title')}</h2>
              <SearchForm isAuthenticated={isAuthenticated} />
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="font-semibold mb-2">
                  {t('homepage.intelligent_grouping')}
                </h3>
                <p className="text-sm text-base-content/70">
                  {t('homepage.intelligent_grouping_description')}
                </p>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="font-semibold mb-2">
                  {t('homepage.easy_export')}
                </h3>
                <p className="text-sm text-base-content/70">
                  {t('homepage.easy_export_description')}
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

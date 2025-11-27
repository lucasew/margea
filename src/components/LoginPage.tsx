import { Eye, Edit } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { Footer } from './Footer';

interface LoginPageProps {
  onSkip?: () => void;
  currentMode?: 'read' | 'write' | null;
}

export function LoginPage({ onSkip, currentMode }: LoginPageProps) {
  const { t } = useTranslation();
  const handleGitHubLogin = async (mode: 'read' | 'write') => {
    // Se já está autenticado, fazer logout primeiro para limpar o cookie antigo
    if (currentMode) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error logging out before re-auth:', error);
      }
    }
    window.location.href = `/api/auth/github?mode=${mode}`;
  };

  const isReauthorizing = !!currentMode;

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-base-300 rounded-lg p-8 bg-base-100">
          <div className="flex flex-col items-center mb-8">
            <Logo size={64} className="text-primary mb-3" />
            <h1 className="text-3xl font-bold mb-2">Margea</h1>
            <p className="text-base-content/70 text-center">
              {t('loginPage.subtitle')}
            </p>
          </div>

          {isReauthorizing && (
            <div className="alert alert-info mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm">
                {t('loginPage.reauthorizingMessage', { currentMode: currentMode === 'read' ? t('loginPage.readOnly') : t('loginPage.readWrite') })}
              </span>
            </div>
          )}

          <div className="mb-6">
            <h2 className="font-semibold text-lg mb-3 text-center">
              {isReauthorizing ? t('loginPage.chooseNewAccessLevel') : t('loginPage.chooseAccessLevel')}
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleGitHubLogin('read')}
                className="btn btn-outline btn-lg gap-2 flex-col h-auto py-4"
              >
                <div className="flex items-center gap-2">
                  <Eye size={24} />
                  <span className="font-bold">{t('loginPage.readOnly')}</span>
                </div>
                <span className="text-xs opacity-70 normal-case font-normal">
                  {t('loginPage.readOnlyDescription')}
                </span>
              </button>

              <button
                onClick={() => handleGitHubLogin('write')}
                className="btn btn-primary btn-lg gap-2 flex-col h-auto py-4"
              >
                <div className="flex items-center gap-2">
                  <Edit size={24} />
                  <span className="font-bold">{t('loginPage.readWrite')}</span>
                </div>
                <span className="text-xs opacity-90 normal-case font-normal">
                  {t('loginPage.readWriteDescription')}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {onSkip && (
              <button
                onClick={onSkip}
                className="btn btn-ghost"
              >
                {t('loginPage.continueWithoutAuth')}
              </button>
            )}
          </div>

          {onSkip && (
            <div className="alert alert-warning mt-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm">{t('loginPage.noAuthWarning')}</span>
            </div>
          )}

          <div className="divider mt-8">{t('loginPage.howItWorks')}</div>

          <div className="text-sm text-base-content/70 space-y-2">
            <p>{t('loginPage.step1')}</p>
            <p>{t('loginPage.step2')}</p>
            <p>{t('loginPage.step3')}</p>
            <p>{t('loginPage.step4')}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

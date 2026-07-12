import { useState } from 'react';
import { Eye, Edit, Key, Info } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { Footer } from './Footer';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { invalidateAuthSessionCache } from '../services/auth';
import { reportError } from '../utils/errorReporting';
import { API_ROUTES, APP_ROUTES } from '../constants';

export function LoginPage() {
  const { t } = useTranslation();
  const { currentMode, isReauthenticating } = useAuth();
  const reauthMode = isReauthenticating ? currentMode : null;
  const [authTab, setAuthTab] = useState<'oauth' | 'pat'>('oauth');
  const [patToken, setPatToken] = useState('');
  const [patError, setPatError] = useState<string | null>(null);
  const [isPATLoading, setIsPATLoading] = useState(false);

  const clearSessionIfNeeded = async () => {
    if (!reauthMode) return;
    try {
      await fetch(API_ROUTES.AUTH_LOGOUT, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      reportError(error, { context: 'logging out before re-auth' });
    } finally {
      // Cookie may be gone while JS still holds the old token — drop caches.
      invalidateAuthSessionCache();
    }
  };

  const handleGitHubLogin = async (mode: 'read' | 'write') => {
    await clearSessionIfNeeded();
    window.location.href = `${API_ROUTES.AUTH_GITHUB}?mode=${mode}`;
  };

  const handlePATLogin = async () => {
    const token = patToken.trim();
    if (!token) {
      setPatError(t('loginPage.patTokenRequired'));
      return;
    }

    setIsPATLoading(true);
    setPatError(null);

    try {
      await clearSessionIfNeeded();
      const response = await fetch(API_ROUTES.AUTH_PAT, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          mode: 'write',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setPatError(errorText || t('loginPage.patLoginFailed'));
        return;
      }

      window.location.href = APP_ROUTES.HOME;
    } catch (error) {
      reportError(error, { context: 'authenticating with PAT' });
      setPatError(t('loginPage.patLoginFailed'));
    } finally {
      setIsPATLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-container flex justify-end py-3">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="login-surface">
          <div className="flex flex-col items-center mb-7 text-center">
            <Logo size={48} className="text-primary mb-3" />
            <h1 className="text-2xl font-semibold tracking-tight mb-1">
              Margea
            </h1>
            <p className="text-sm text-base-content/70 max-w-[28ch]">
              {t('loginPage.subtitle')}
            </p>
          </div>

          {reauthMode && (
            <div className="alert alert-info mb-5 py-2.5 text-sm">
              <Info size={18} />
              <span>
                {t('loginPage.reauthorizingMessage', {
                  currentMode:
                    reauthMode === 'read'
                      ? t('loginPage.readOnly')
                      : t('loginPage.readWrite'),
                })}
              </span>
            </div>
          )}

          <div role="tablist" className="tabs tabs-box tabs-sm mb-5 w-full">
            <button
              role="tab"
              type="button"
              className={`tab flex-1 ${authTab === 'oauth' ? 'tab-active' : ''}`}
              onClick={() => setAuthTab('oauth')}
              aria-selected={authTab === 'oauth'}
            >
              OAuth
            </button>
            <button
              role="tab"
              type="button"
              className={`tab flex-1 ${authTab === 'pat' ? 'tab-active' : ''}`}
              onClick={() => setAuthTab('pat')}
              aria-selected={authTab === 'pat'}
            >
              {t('loginPage.patLabel')}
            </button>
          </div>

          {authTab === 'oauth' ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                {reauthMode
                  ? t('loginPage.chooseNewAccessLevel')
                  : t('loginPage.chooseAccessLevel')}
              </p>

              <button
                type="button"
                onClick={() => handleGitHubLogin('read')}
                className="access-option"
              >
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <Eye size={18} className="text-base-content/70" aria-hidden />
                  {t('loginPage.readOnly')}
                </span>
                <span className="text-xs text-base-content/65 pl-7">
                  {t('loginPage.readOnlyDescription')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGitHubLogin('write')}
                className="access-option access-option-primary"
              >
                <span className="flex items-center gap-2 font-semibold text-sm text-primary">
                  <Edit size={18} aria-hidden />
                  {t('loginPage.readWrite')}
                </span>
                <span className="text-xs text-base-content/70 pl-7">
                  {t('loginPage.readWriteDescription')}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                {t('loginPage.enterPAT')}
              </p>
              <label className="form-control w-full">
                <span className="label-text text-xs mb-1">
                  {t('loginPage.patLabel')}
                </span>
                <input
                  type="password"
                  value={patToken}
                  onChange={(e) => setPatToken(e.target.value)}
                  placeholder={t('loginPage.patPlaceholder')}
                  className="input input-bordered input-sm w-full"
                  autoComplete="off"
                />
              </label>

              <button
                type="button"
                onClick={handlePATLogin}
                disabled={isPATLoading}
                className="btn btn-primary btn-sm w-full gap-2"
              >
                <Key size={15} aria-hidden />
                {isPATLoading
                  ? t('loginPage.patSubmitting')
                  : t('loginPage.continueWithPAT')}
              </button>

              {patError && (
                <div role="alert" className="alert alert-error py-2 text-sm">
                  <span>{patError}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-base-300">
            <p className="text-xs font-medium text-base-content/55 mb-2">
              {t('loginPage.howItWorks')}
            </p>
            <ol className="text-xs text-base-content/65 space-y-1.5 list-decimal list-inside">
              <li>{t('loginPage.step1')}</li>
              <li>{t('loginPage.step2')}</li>
              <li>{t('loginPage.step3')}</li>
              <li>{t('loginPage.step4')}</li>
            </ol>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

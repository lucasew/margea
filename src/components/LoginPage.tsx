import { useState } from 'react';
import { Eye, Edit, Key } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { Footer } from './Footer';
import { reportError } from '../utils/errorReporting';

interface LoginPageProps {
  currentMode?: 'read' | 'write' | null;
}

export function LoginPage({ currentMode }: LoginPageProps) {
  const { t } = useTranslation();
  const [authTab, setAuthTab] = useState<'oauth' | 'pat'>('oauth');
  const [patToken, setPatToken] = useState('');
  const [patError, setPatError] = useState<string | null>(null);
  const [isPATLoading, setIsPATLoading] = useState(false);

  const clearSessionIfNeeded = async () => {
    if (!currentMode) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      reportError(error, { context: 'Error logging out before re-auth' });
    }
  };

  const handleGitHubLogin = async (mode: 'read' | 'write') => {
    await clearSessionIfNeeded();
    window.location.href = `/api/auth/github?mode=${mode}`;
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
      const response = await fetch('/api/auth/pat', {
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

      window.location.href = '/';
    } catch (error) {
      reportError(error, { context: 'Error authenticating with PAT' });
      setPatError(t('loginPage.patLoginFailed'));
    } finally {
      setIsPATLoading(false);
    }
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
              <span className="text-sm">
                {t('loginPage.reauthorizingMessage', {
                  currentMode:
                    currentMode === 'read'
                      ? t('loginPage.readOnly')
                      : t('loginPage.readWrite'),
                })}
              </span>
            </div>
          )}

          <div className="mb-6">
            <div role="tablist" className="tabs tabs-box mb-4">
              <button
                role="tab"
                type="button"
                className={`tab flex-1 ${authTab === 'oauth' ? 'tab-active' : ''}`}
                onClick={() => setAuthTab('oauth')}
              >
                OAuth
              </button>
              <button
                role="tab"
                type="button"
                className={`tab flex-1 ${authTab === 'pat' ? 'tab-active' : ''}`}
                onClick={() => setAuthTab('pat')}
              >
                {t('loginPage.patLabel')}
              </button>
            </div>

            {authTab === 'oauth' ? (
              <>
                <h2 className="font-semibold text-lg mb-3 text-center">
                  {isReauthorizing
                    ? t('loginPage.chooseNewAccessLevel')
                    : t('loginPage.chooseAccessLevel')}
                </h2>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleGitHubLogin('read')}
                    className="btn btn-outline btn-lg gap-2 flex-col h-auto py-4"
                  >
                    <div className="flex items-center gap-2">
                      <Eye size={24} />
                      <span className="font-bold">
                        {t('loginPage.readOnly')}
                      </span>
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
                      <span className="font-bold">
                        {t('loginPage.readWrite')}
                      </span>
                    </div>
                    <span className="text-xs opacity-90 normal-case font-normal">
                      {t('loginPage.readWriteDescription')}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h2 className="font-semibold text-lg mb-1 text-center">
                  {t('loginPage.enterPAT')}
                </h2>
                <label className="form-control w-full">
                  <span className="label-text mb-1">
                    {t('loginPage.patLabel')}
                  </span>
                  <input
                    type="password"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    placeholder={t('loginPage.patPlaceholder')}
                    className="input input-bordered w-full"
                    autoComplete="off"
                  />
                </label>

                <button
                  type="button"
                  onClick={handlePATLogin}
                  disabled={isPATLoading}
                  className="btn btn-secondary w-full gap-2"
                >
                  <Key size={16} />
                  {isPATLoading
                    ? t('loginPage.patSubmitting')
                    : t('loginPage.continueWithPAT')}
                </button>

                {patError && (
                  <div role="alert" className="alert alert-error">
                    <span className="text-sm">{patError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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

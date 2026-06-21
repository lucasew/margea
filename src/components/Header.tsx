import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, Edit, GitHub } from 'react-feather';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { RateLimitIndicator } from './RateLimitIndicator';

interface HeaderProps {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions?: () => void;
  isAuthenticated: boolean;
  currentMode?: 'read' | 'write' | null;
}

export function Header({
  onLogout,
  onLogin,
  onChangePermissions,
  isAuthenticated,
  currentMode,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="header-bar">
      <div className="app-container">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity duration-150"
          >
            <Logo size={22} className="text-primary flex-shrink-0" />
            <span className="font-semibold text-base tracking-tight">Margea</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            <a
              href="https://github.com/lucasew/margea"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm btn-square"
              title={t('common.viewOnGitHub')}
              aria-label={t('common.viewOnGitHub')}
            >
              <GitHub size={18} />
            </a>

            {isAuthenticated ? (
              <>
                {currentMode && (
                  <div className="mode-pill hidden sm:inline-flex">
                    {currentMode === 'read' ? (
                      <Eye size={13} aria-hidden />
                    ) : (
                      <Edit size={13} aria-hidden />
                    )}
                    <span>
                      {currentMode === 'read'
                        ? t('permissions.read')
                        : t('permissions.write')}
                    </span>
                    {onChangePermissions && (
                      <button
                        type="button"
                        onClick={onChangePermissions}
                        className="ml-0.5 underline opacity-70 hover:opacity-100"
                        title={t('permissions.changeTitle')}
                      >
                        {t('permissions.change')}
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="btn btn-ghost btn-sm"
                >
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="btn btn-primary btn-sm"
              >
                {t('header.login')}
              </button>
            )}

            <RateLimitIndicator />
          </div>
        </div>
      </div>
    </header>
  );
}

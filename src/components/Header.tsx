import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitHub } from 'react-feather';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { RateLimitIndicator, UserAccountMenu } from './RateLimitIndicator';

interface HeaderProps {
  onLogout: () => void;
  onLogin: () => void;
  onToggleMode?: () => void;
  isAuthenticated: boolean;
  currentMode?: 'read' | 'write' | null;
  tokenCapability?: 'read' | 'write' | null;
}

export function Header({
  onLogout,
  onLogin,
  onToggleMode,
  isAuthenticated,
  currentMode,
  tokenCapability,
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
              <UserAccountMenu
                currentMode={currentMode}
                onToggleMode={onToggleMode}
                onLogout={onLogout}
                modeToggleDisabled={tokenCapability !== 'write'}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="btn btn-primary btn-sm"
                >
                  {t('header.login')}
                </button>
                <RateLimitIndicator />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

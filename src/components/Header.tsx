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
    <header className="border-b border-base-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Logo size={24} />
            <span className="font-bold text-lg">Margea</span>
          </Link>
          <div className="flex items-center gap-3">
            <RateLimitIndicator />
            <ThemeToggle />
            <a
              href="https://github.com/lucasew/margea"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Ver repositório no GitHub"
            >
              <GitHub size={20} />
            </a>
            {isAuthenticated ? (
              <>
                {currentMode && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-base-200 text-sm">
                    {currentMode === 'read' ? (
                      <>
                        <Eye size={16} />
                        <span>Leitura</span>
                      </>
                    ) : (
                      <>
                        <Edit size={16} />
                        <span>Escrita</span>
                      </>
                    )}
                    {onChangePermissions && (
                      <button
                        onClick={onChangePermissions}
                        className="ml-2 text-xs underline opacity-70 hover:opacity-100"
                        title="Mudar permissões"
                      >
                        alterar
                      </button>
                    )}
                  </div>
                )}
                <button onClick={onLogout} className="btn btn-ghost btn-sm">
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <button onClick={onLogin} className="btn btn-ghost btn-sm">
                {t('header.login')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

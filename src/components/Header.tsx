import { LogOut, LogIn } from 'react-feather';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

interface HeaderProps {
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean;
}

export function Header({ onLogout, onLogin, isAuthenticated }: HeaderProps) {
  return (
    <header className="navbar bg-base-100 shadow-lg border-b border-base-300 px-4 md:px-6">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <Logo size={40} className="text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-base-content">
              Margea
            </h1>
            <p className="text-xs text-base-content/60 hidden md:block">
              Analisador de Pull Requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex-none">
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <button
              onClick={onLogout}
              className="btn btn-ghost btn-sm gap-2"
              title="Sair"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Sair</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="btn btn-primary btn-sm gap-2"
              title="Fazer login"
            >
              <LogIn size={18} />
              <span className="hidden md:inline">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

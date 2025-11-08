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
    <header className="navbar bg-base-100 shadow-xl border-b-2 border-primary/10 px-4 md:px-6 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Logo size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-base-content tracking-tight">
              Margea
            </h1>
            <p className="text-xs text-primary/80 hidden md:block font-medium">
              Analisador de Pull Requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex-none">
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <button
              onClick={onLogout}
              className="btn btn-ghost btn-sm gap-2 hover:bg-error/10 hover:text-error"
              title="Sair"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Sair</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="btn btn-primary btn-sm gap-2 shadow-md hover:shadow-lg transition-shadow"
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

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
    <div className="navbar bg-base-100 shadow-lg overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-content rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0">
            <div className="w-6 h-6">
              <Logo size={24} />
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              Margea
            </h1>
            <p className="text-xs text-base-content/60 hidden md:block">
              Analisador de Pull Requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex-none gap-3 flex items-center">
        <div className="flex-shrink-0">
          <ThemeToggle />
        </div>

        {isAuthenticated ? (
          <button
            onClick={onLogout}
            className="btn btn-ghost btn-sm gap-2"
            title="Sair"
          >
            <span className="w-[18px] h-[18px] flex-shrink-0">
              <LogOut size={18} />
            </span>
            <span className="hidden md:inline">Sair</span>
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="btn btn-primary btn-sm gap-2"
            title="Fazer login"
          >
            <span className="w-[18px] h-[18px] flex-shrink-0">
              <LogIn size={18} />
            </span>
            <span className="hidden md:inline">Login</span>
          </button>
        )}
      </div>
    </div>
  );
}

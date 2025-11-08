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
    <header className="navbar bg-base-100 shadow-md border-b border-base-200 px-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-content rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0">
            <div className="w-5 h-5">
              <Logo size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold">Margea</h1>
            <div className="badge badge-primary badge-sm">Beta</div>
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
              <span className="w-4 h-4 flex-shrink-0">
                <LogOut size={16} />
              </span>
              <span className="hidden md:inline">Sair</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="btn btn-primary btn-sm gap-2"
              title="Fazer login com GitHub"
            >
              <span className="w-4 h-4 flex-shrink-0">
                <LogIn size={16} />
              </span>
              <span className="hidden md:inline">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

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
    <header className="navbar bg-base-100 border-b border-base-200 px-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <h1 className="text-lg font-bold">Margea</h1>
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
              <LogOut size={16} />
              <span className="hidden md:inline">Sair</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="btn btn-ghost btn-sm gap-2"
              title="Fazer login com GitHub"
            >
              <LogIn size={16} />
              <span className="hidden md:inline">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

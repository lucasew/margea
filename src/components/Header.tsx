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
    <header className="navbar bg-base-100 px-4 sm:px-6 lg:px-8">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="font-bold text-lg">Margea</span>
        </div>
      </div>
      <div className="flex-none">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <button onClick={onLogout} className="btn btn-ghost btn-sm">
              Sair
            </button>
          ) : (
            <button onClick={onLogin} className="btn btn-ghost btn-sm">
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

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
    <header className="border-b border-base-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span className="font-bold text-lg">Margea</span>
          </div>
          <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
}

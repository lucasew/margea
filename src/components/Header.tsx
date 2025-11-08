import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">Margea</a>
      </div>
      <div className="flex-none gap-2">
        <ThemeToggle />
        <button onClick={onLogout} className="btn btn-ghost btn-sm">
          Sair
        </button>
      </div>
    </div>
  );
}

import { Heart } from 'react-feather';
import { Logo } from './Logo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-base-200 border-t border-base-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 text-primary flex-shrink-0">
                <Logo size={32} className="text-primary" />
              </div>
              <span className="font-bold text-lg">Margea</span>
            </div>
            <p className="text-sm text-base-content/70">
              Ferramenta para análise e agrupamento de Pull Requests do GitHub,
              com foco em atualizações do Renovate Bot.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="font-semibold mb-3 text-base-content">Recursos</h3>
            <ul className="space-y-2 text-sm text-base-content/70">
              <li>
                <a
                  href="https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Como gerar token GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/renovatebot/renovate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Sobre o Renovate Bot
                </a>
              </li>
            </ul>
          </div>

          {/* Info Section */}
          <div>
            <h3 className="font-semibold mb-3 text-base-content">Tecnologias</h3>
            <ul className="space-y-2 text-sm text-base-content/70">
              <li>React + TypeScript</li>
              <li>Relay GraphQL</li>
              <li>GitHub GraphQL API</li>
              <li>Tailwind CSS + DaisyUI</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="divider my-6"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-base-content/60">
          <p className="flex items-center gap-1">
            Feito com <span className="w-[14px] h-[14px] text-error"><Heart size={14} className="text-error fill-error" /></span> usando React e GitHub API
          </p>
          <p>&copy; {currentYear} Margea. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

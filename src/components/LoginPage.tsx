import { Eye, Edit } from 'react-feather';
import { Logo } from './Logo';
import { Footer } from './Footer';

interface LoginPageProps {
  onSkip?: () => void;
}

export function LoginPage({ onSkip }: LoginPageProps) {
  const handleGitHubLogin = (mode: 'read' | 'write') => {
    window.location.href = `/api/auth/github?mode=${mode}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-base-300 rounded-lg p-8 bg-base-100">
          <div className="flex flex-col items-center mb-8">
            <Logo size={64} className="text-primary mb-3" />
            <h1 className="text-3xl font-bold mb-2">Margea</h1>
            <p className="text-base-content/70 text-center">
              Analisador de Pull Requests do GitHub
            </p>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold text-lg mb-3 text-center">Escolha o nível de acesso:</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleGitHubLogin('read')}
                className="btn btn-outline btn-lg gap-2 flex-col h-auto py-4"
              >
                <div className="flex items-center gap-2">
                  <Eye size={24} />
                  <span className="font-bold">Somente Leitura</span>
                </div>
                <span className="text-xs opacity-70 normal-case font-normal">
                  Visualizar PRs • Sem permissão para mergear/fechar
                </span>
              </button>

              <button
                onClick={() => handleGitHubLogin('write')}
                className="btn btn-primary btn-lg gap-2 flex-col h-auto py-4"
              >
                <div className="flex items-center gap-2">
                  <Edit size={24} />
                  <span className="font-bold">Leitura e Escrita</span>
                </div>
                <span className="text-xs opacity-90 normal-case font-normal">
                  Visualizar PRs • Mergear e fechar PRs em lote
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {onSkip && (
              <button
                onClick={onSkip}
                className="btn btn-ghost"
              >
                Continuar sem autenticação
              </button>
            )}
          </div>

          {onSkip && (
            <div className="alert alert-warning mt-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm">Sem autenticação: limite de 60 requisições/hora</span>
            </div>
          )}

          <div className="divider mt-8">Como funciona?</div>

          <div className="text-sm text-base-content/70 space-y-2">
            <p>• Escolha o nível de acesso desejado</p>
            <p>• Faça login com sua conta GitHub</p>
            <p>• Autorize o app conforme o nível escolhido</p>
            <p>• Busque, filtre e gerencie PRs facilmente</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

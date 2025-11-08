import { useState } from 'react';
import { Key, AlertCircle } from 'react-feather';
import { Logo } from './Logo';
import { Footer } from './Footer';

interface LoginPageProps {
  onLogin: (token: string) => void;
  onSkip?: () => void;
}

export function LoginPage({ onLogin, onSkip }: LoginPageProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError('Por favor, insira um token válido');
      return;
    }

    // Basic validation - GitHub tokens are typically 40+ characters
    if (token.trim().length < 20) {
      setError('O token parece inválido. Verifique se copiou corretamente.');
      return;
    }

    onLogin(token.trim());
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col items-center mb-4">
              <Logo size={64} className="text-primary mb-3" />
              <h1 className="text-3xl font-bold mb-2">Margea</h1>
              <p className="text-base-content/70 text-center">
                Analisador de Pull Requests do GitHub
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">GitHub Token</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-base-content/50">
                    <Key size={20} />
                  </span>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="input input-bordered w-full pl-11"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setError('');
                    }}
                  />
                </div>
                <label className="label">
                  <span className="label-text-alt">
                    Seu token é armazenado apenas localmente
                  </span>
                </label>
              </div>

              {error && (
                <div className="alert alert-error mt-4">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <div className="card-actions justify-end mt-6 gap-2">
                {onSkip && (
                  <button type="button" onClick={onSkip} className="btn btn-ghost flex-1">
                    Continuar sem token
                  </button>
                )}
                <button type="submit" className="btn btn-primary flex-1">
                  Entrar
                </button>
              </div>
            </form>

            {onSkip && (
              <div className="alert alert-warning mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-sm">Sem token, você terá limite de 60 requisições/hora</span>
              </div>
            )}

            <div className="divider">Como gerar um token?</div>

            <div className="text-sm text-base-content/70">
              <ol className="list-decimal list-inside space-y-2">
                <li>Acesse GitHub Settings → Developer settings</li>
                <li>Personal access tokens → Tokens (classic)</li>
                <li>Generate new token (classic)</li>
                <li>Selecione as permissões: <code className="bg-base-200 px-1 rounded">repo</code></li>
                <li>Copie e cole o token aqui</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

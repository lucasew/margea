import { useState } from 'react';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
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
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-3xl font-bold mb-2">Margea</h1>
          <p className="text-base-content/70 mb-6">
            Analisador de Pull Requests do GitHub
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">GitHub Token</span>
              </label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="input input-bordered"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setError('');
                }}
              />
              <label className="label">
                <span className="label-text-alt">
                  Seu token é armazenado apenas localmente
                </span>
              </label>
            </div>

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <div className="card-actions justify-end mt-6">
              <button type="submit" className="btn btn-primary w-full">
                Entrar
              </button>
            </div>
          </form>

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
    </div>
  );
}

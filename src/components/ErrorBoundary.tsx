import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'react-feather';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <AlertTriangle size={64} className="text-error mb-4" />
              <h2 className="card-title text-2xl mb-2">Algo deu errado</h2>
              <p className="text-base-content/70 mb-4">
                Ocorreu um erro inesperado na aplicação.
              </p>

              {this.state.error && (
                <div className="alert alert-error w-full mb-4">
                  <div className="flex flex-col items-start gap-2 w-full">
                    <span className="font-semibold">Detalhes do erro:</span>
                    <code className="text-sm bg-base-200 p-2 rounded w-full text-left overflow-x-auto">
                      {this.state.error.message}
                    </code>
                  </div>
                </div>
              )}

              <div className="card-actions">
                <button
                  onClick={this.handleReset}
                  className="btn btn-primary gap-2"
                >
                  <RefreshCw size={18} />
                  Tentar novamente
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-ghost gap-2"
                >
                  Recarregar página
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

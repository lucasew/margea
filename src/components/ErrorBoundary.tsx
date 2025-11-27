import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'react-feather';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryComponent extends Component<Props, State> {
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
    const { t } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <AlertTriangle size={64} className="text-error mb-4" />
              <h2 className="card-title text-2xl mb-2">{t('errorBoundary.title')}</h2>
              <p className="text-base-content/70 mb-4">
                {t('errorBoundary.message')}
              </p>

              {this.state.error && (
                <div className="alert alert-error w-full mb-4">
                  <div className="flex flex-col items-start gap-2 w-full">
                    <span className="font-semibold">{t('errorBoundary.errorDetails')}</span>
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
                  {t('errorBoundary.tryAgain')}
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-ghost gap-2"
                >
                  {t('errorBoundary.reloadPage')}
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

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent);

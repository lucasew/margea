import { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'react-feather';
import { useTranslation } from 'react-i18next';
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from 'react-error-boundary';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <AlertTriangle size={64} className="text-error mb-4" />
          <h2 className="card-title text-2xl mb-2">
            {t('errorBoundary.title')}
          </h2>
          <p className="text-base-content/70 mb-4">
            {t('errorBoundary.message')}
          </p>

          {error && (
            <div className="alert alert-error w-full mb-4">
              <div className="flex flex-col items-start gap-2 w-full">
                <span className="font-semibold">
                  {t('errorBoundary.errorDetails')}:
                </span>
                <code className="text-sm bg-base-200 p-2 rounded w-full text-left overflow-x-auto">
                  {error.message}
                </code>
              </div>
            </div>
          )}

          <div className="card-actions">
            <button
              onClick={resetErrorBoundary}
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

export function ErrorBoundary({ children, fallback }: Props) {
  const logError = (error: Error, info: { componentStack?: string | null }) => {
    console.error('ErrorBoundary caught an error:', error, info);
  };

  return (
    <ReactErrorBoundary
      fallbackRender={(props) => {
        if (fallback) {
          return <>{fallback}</>;
        }
        return <ErrorFallback {...props} />;
      }}
      onError={logError}
    >
      {children}
    </ReactErrorBoundary>
  );
}

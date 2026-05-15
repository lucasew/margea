import { Download } from 'react-feather';
import { useFetchPhase } from '../hooks/usePRStore';
import { prStore, isBusy, FetchPhase } from '../services/prStore';

const PHASE_LABEL: Record<FetchPhase, string> = {
  idle: 'Buscar mais PRs',
  loading: 'Carregando...',
  streaming: 'Recebendo PRs...',
  loading_more: 'Buscando mais...',
  streaming_more: 'Recebendo mais...',
  error: 'Tentar novamente',
};

export function FetchSpeedDial() {
  const phase = useFetchPhase();
  const busy = isBusy(phase);

  const handleClick = () => {
    if (busy) return;
    if (phase === 'error') {
      prStore.refresh();
    } else {
      prStore.loadNextPage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="tooltip tooltip-left" data-tip={PHASE_LABEL[phase]}>
        <button
          onClick={handleClick}
          disabled={busy}
          aria-label={PHASE_LABEL[phase]}
          className={`btn btn-circle btn-lg shadow-xl ${
            busy
              ? 'btn-disabled'
              : phase === 'error'
                ? 'btn-error'
                : 'btn-primary'
          }`}
        >
          {busy ? (
            <span className="loading loading-spinner loading-md" />
          ) : (
            <Download size={24} />
          )}
        </button>
      </div>
    </div>
  );
}

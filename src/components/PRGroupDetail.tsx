import { PRGroup } from '../types';

interface PRGroupDetailProps {
  group: PRGroup;
  onBack: () => void;
}

export function PRGroupDetail({ group, onBack }: PRGroupDetailProps) {
  const stateColors = {
    OPEN: 'badge-success',
    MERGED: 'badge-info',
    CLOSED: 'badge-error',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <button onClick={onBack} className="btn btn-ghost gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Voltar
        </button>
      </div>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h1 className="card-title text-3xl">
            <span className="font-mono text-primary">{group.package}</span>
          </h1>
          <div className="text-base-content/70">
            <p>Branch base: <span className="font-mono">{group.baseRef}</span></p>
            <p className="mt-2">{group.count} pull requests neste grupo</p>
            {group.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {group.labels.map((label) => (
                  <div key={label} className="badge badge-outline">
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {group.prs.map((pr) => (
          <div key={pr.id} className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="card-title text-lg">
                    {pr.title}
                  </h3>
                  <p className="text-sm text-base-content/70 mt-1">
                    {pr.repository.nameWithOwner} #{pr.number}
                  </p>
                </div>
                <div className={`badge ${stateColors[pr.state]}`}>
                  {pr.state.toLowerCase()}
                </div>
              </div>

              <div className="text-sm text-base-content/60 mt-2">
                <div className="flex flex-wrap gap-4">
                  <span>Criado: {formatDate(pr.createdAt)}</span>
                  <span>Atualizado: {formatDate(pr.updatedAt)}</span>
                  {pr.mergedAt && <span>Merged: {formatDate(pr.mergedAt)}</span>}
                  {pr.closedAt && !pr.mergedAt && <span>Fechado: {formatDate(pr.closedAt)}</span>}
                </div>
              </div>

              {pr.author && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={pr.author.avatarUrl}
                    alt={pr.author.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm">@{pr.author.login}</span>
                </div>
              )}

              {pr.labels?.nodes && pr.labels.nodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pr.labels.nodes.map((label) => (
                    <div
                      key={label.id}
                      className="badge badge-sm"
                      style={{ backgroundColor: `#${label.color}`, color: '#fff' }}
                    >
                      {label.name}
                    </div>
                  ))}
                </div>
              )}

              <div className="card-actions justify-end mt-4">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  Abrir no GitHub
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

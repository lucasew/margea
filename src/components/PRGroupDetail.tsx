import { ArrowLeft, Package, GitBranch, Tag, ExternalLink, Calendar, User } from 'react-feather';
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
          <ArrowLeft size={20} />
          Voltar
        </button>
      </div>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h1 className="card-title text-3xl flex items-center gap-3">
            <Package size={32} className="text-primary" />
            <span className="font-mono text-primary">{group.package}</span>
          </h1>
          <div className="text-base-content/70 space-y-2">
            <p className="flex items-center gap-2">
              <GitBranch size={18} />
              Branch base: <span className="font-mono">{group.baseRef}</span>
            </p>
            <p>{group.count} pull requests neste grupo</p>
            {group.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                <Tag size={18} className="text-base-content/60" />
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
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Criado: {formatDate(pr.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Atualizado: {formatDate(pr.updatedAt)}
                  </span>
                  {pr.mergedAt && (
                    <span className="flex items-center gap-1 text-info">
                      <Calendar size={14} />
                      Merged: {formatDate(pr.mergedAt)}
                    </span>
                  )}
                  {pr.closedAt && !pr.mergedAt && (
                    <span className="flex items-center gap-1 text-error">
                      <Calendar size={14} />
                      Fechado: {formatDate(pr.closedAt)}
                    </span>
                  )}
                </div>
              </div>

              {pr.author && (
                <div className="flex items-center gap-2 mt-2">
                  <User size={16} className="text-base-content/60" />
                  <img
                    src={pr.author.avatarUrl}
                    alt={pr.author.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm">@{pr.author.login}</span>
                </div>
              )}

              {pr.labels?.nodes && pr.labels.nodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 items-center">
                  <Tag size={14} className="text-base-content/60" />
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
                  className="btn btn-primary btn-sm gap-2"
                >
                  <ExternalLink size={16} />
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

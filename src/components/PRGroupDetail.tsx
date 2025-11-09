import { ArrowLeft, Package, GitBranch, Tag, ExternalLink, Calendar, User, GitCommit } from 'react-feather';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Back Button */}
        <div className="mb-6">
          <button onClick={onBack} className="btn btn-ghost gap-2">
            <ArrowLeft size={20} />
            Voltar para grupos
          </button>
        </div>

        {/* Group Header */}
        <div className="border border-base-300 rounded-lg p-6 mb-8 bg-base-100">
          <div className="flex items-center gap-4 mb-6">
            <Package size={32} className="text-primary flex-shrink-0" />
            <h1 className="text-3xl md:text-4xl font-bold font-mono break-all">{group.package}</h1>
          </div>

            <div className="divider my-2"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-base-content/80">
                <GitBranch size={18} className="text-primary" />
                <span className="font-semibold">Branch:</span>
                <span className="font-mono badge badge-outline">{group.baseRef}</span>
              </div>

              <div className="flex items-center gap-2 text-base-content/80">
                <GitCommit size={18} className="text-primary" />
                <span className="font-semibold">Total:</span>
                <span className="badge badge-neutral">{group.count} PRs</span>
              </div>
            </div>

            {group.labels.length > 0 && (
              <>
                <div className="divider my-2"></div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Tag size={18} className="text-base-content/60" />
                  <span className="font-semibold text-sm">Labels:</span>
                  {group.labels.map((label) => (
                    <div key={label} className="badge badge-outline">
                      {label}
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>

        {/* PRs List */}
        <div className="space-y-4">
          {group.prs.map((pr) => (
            <div key={pr.id} className="border border-base-300 rounded-lg p-6 hover:border-primary/30 transition-all bg-base-100">
                {/* PR Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold break-words">
                      {pr.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-base-content/70">
                      <span className="font-mono">{pr.repository.nameWithOwner}</span>
                      <span className="badge badge-sm badge-ghost">#{pr.number}</span>
                    </div>
                  </div>

                  <div className={`badge ${stateColors[pr.state]} badge-lg flex-shrink-0`}>
                    {pr.state}
                  </div>
                </div>

                <div className="divider my-2"></div>

                {/* PR Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-base-content/70">
                    <Calendar size={14} className="flex-shrink-0" />
                    <span className="truncate">
                      <span className="font-semibold">Criado:</span> {formatDate(pr.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-base-content/70">
                    <Calendar size={14} className="flex-shrink-0" />
                    <span className="truncate">
                      <span className="font-semibold">Atualizado:</span> {formatDate(pr.updatedAt)}
                    </span>
                  </div>

                  {pr.mergedAt && (
                    <div className="flex items-center gap-2 text-info">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        <span className="font-semibold">Merged:</span> {formatDate(pr.mergedAt)}
                      </span>
                    </div>
                  )}

                  {pr.closedAt && !pr.mergedAt && (
                    <div className="flex items-center gap-2 text-error">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        <span className="font-semibold">Fechado:</span> {formatDate(pr.closedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Author */}
                {pr.author && (
                  <>
                    <div className="divider my-2"></div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-base-content/60" />
                      <div className="avatar">
                        <div className="w-6 rounded-full">
                          <img src={pr.author.avatarUrl} alt={pr.author.login} />
                        </div>
                      </div>
                      <span className="text-sm font-mono">@{pr.author.login}</span>
                    </div>
                  </>
                )}

                {/* Labels */}
                {pr.labels?.nodes && pr.labels.nodes.length > 0 && (
                  <>
                    <div className="divider my-2"></div>
                    <div className="flex flex-wrap gap-2 items-center">
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
                  </>
                )}

                {/* Actions */}
                <div className="flex justify-end mt-4">
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
          ))}
        </div>
      </div>
    </div>
  );
}

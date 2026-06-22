import { ReactNode } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import { ViewerQuery } from '../queries/ViewerQuery';
import { ViewerQuery as ViewerQueryType } from '../queries/__generated__/ViewerQuery.graphql';
import { ViewerContext } from './ViewerContext';

/**
 * Single ViewerQuery root for the authenticated app shell.
 * Children read via useViewer(); do not add another ViewerQuery elsewhere.
 */
export function ViewerProvider({ children }: { children: ReactNode }) {
  const data = useLazyLoadQuery<ViewerQueryType>(ViewerQuery, {});

  const organizations = (data.viewer.organizations?.nodes || []).filter(
    (org): org is NonNullable<typeof org> => org != null,
  );

  return (
    <ViewerContext.Provider value={{ viewer: data.viewer, organizations }}>
      {children}
    </ViewerContext.Provider>
  );
}

import { useLazyLoadQuery } from 'react-relay';
import { ViewerQuery } from '../queries/ViewerQuery';
import { ViewerQuery as ViewerQueryType } from '../queries/__generated__/ViewerQuery.graphql';

export function useViewer() {
  const data = useLazyLoadQuery<ViewerQueryType>(
    ViewerQuery,
    {}
  );

  const organizations = data.viewer.organizations?.nodes || [];

  return {
    viewer: data.viewer,
    organizations: organizations.filter((org): org is NonNullable<typeof org> => org != null),
  };
}

import { useLazyLoadQuery } from 'react-relay';
import { ViewerQuery } from '../queries/ViewerQuery';
import { ViewerQuery as ViewerQueryType } from '../queries/__generated__/ViewerQuery.graphql';

/**
 * Hook to fetch the current authenticated user's profile and organizations.
 *
 * This hook uses Relay's `useLazyLoadQuery` to fetch data during the component render phase.
 * It serves as the primary way to access global user context, such as their login, avatar,
 * and associated organizations.
 *
 * @returns An object containing:
 * - `viewer`: The GitHub user object for the authenticated session.
 * - `organizations`: A filtered list of organizations the user belongs to (excluding nulls).
 */
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

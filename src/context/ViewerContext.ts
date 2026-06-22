import { createContext } from 'react';
import type { ViewerQuery as ViewerQueryType } from '../queries/__generated__/ViewerQuery.graphql';

type ViewerData = ViewerQueryType['response']['viewer'];
type OrgNode = NonNullable<
  NonNullable<NonNullable<ViewerData['organizations']>['nodes']>[number]
>;

export interface ViewerContextValue {
  viewer: ViewerData;
  organizations: OrgNode[];
}

export const ViewerContext = createContext<ViewerContextValue | null>(null);

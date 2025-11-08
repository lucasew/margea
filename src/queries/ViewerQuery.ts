import { graphql } from 'relay-runtime';

export const ViewerQuery = graphql`
  query ViewerQuery {
    viewer {
      login
      name
      avatarUrl(size: 80)
      organizations(first: 100) {
        nodes {
          login
          name
        }
      }
    }
  }
`;

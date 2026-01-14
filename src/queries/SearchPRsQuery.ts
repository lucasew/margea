import { graphql } from 'relay-runtime';

export const SearchPRsQuery = graphql`
  query SearchPRsQuery($searchQuery: String!, $first: Int!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
      issueCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ... on PullRequest {
            id
            number
            title
            body
            state
            additions
            deletions
            commits(last: 1) {
              nodes {
                commit {
                  statusCheckRollup {
                    state
                  }
                }
              }
            }
            createdAt
            updatedAt
            mergedAt
            closedAt
            url
            baseRefName
            headRefName
            author {
              login
              avatarUrl(size: 40)
            }
            labels(first: 10) {
              nodes {
                id
                name
                color
                description
              }
            }
            repository {
              id
              name
              nameWithOwner
              owner {
                login
              }
            }
          }
        }
      }
    }
  }
`;

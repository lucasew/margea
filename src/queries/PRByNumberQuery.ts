import { graphql } from 'relay-runtime';

export const PRByNumberQuery = graphql`
  query PRByNumberQuery($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
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
`;

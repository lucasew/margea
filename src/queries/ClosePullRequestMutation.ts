import { graphql } from 'relay-runtime';

export const ClosePullRequestMutation = graphql`
  mutation ClosePullRequestMutation($input: ClosePullRequestInput!) {
    closePullRequest(input: $input) {
      pullRequest {
        id
        number
        state
        closed
        closedAt
      }
    }
  }
`;

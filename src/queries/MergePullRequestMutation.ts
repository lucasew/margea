import { graphql } from 'relay-runtime';

export const MergePullRequestMutation = graphql`
  mutation MergePullRequestMutation($input: MergePullRequestInput!) {
    mergePullRequest(input: $input) {
      pullRequest {
        id
        number
        state
        merged
        mergedAt
      }
    }
  }
`;

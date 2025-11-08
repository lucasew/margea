import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime';
import { AuthService } from '../services/auth';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const fetchQuery: FetchFunction = async (operation, variables) => {
  const token = AuthService.getToken();

  if (!token) {
    throw new Error('No GitHub token found. Please authenticate first.');
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  });

  const json = await response.json();

  // Check for rate limit info
  if (response.headers.get('X-RateLimit-Remaining')) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    console.log(`GitHub API Rate Limit: ${remaining} remaining, resets at ${reset}`);
  }

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  if (json.errors) {
    console.error('GraphQL errors:', json.errors);
    throw new Error(json.errors[0]?.message || 'GraphQL error occurred');
  }

  return json;
};

function createEnvironment() {
  return new Environment({
    network: Network.create(fetchQuery),
    store: new Store(new RecordSource()),
  });
}

export const relayEnvironment = createEnvironment();

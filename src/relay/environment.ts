import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime';
import { AuthService } from '../services/auth';

const GRAPHQL_PROXY_URL = '/api/graphql';

const fetchQuery: FetchFunction = async (operation, variables) => {
  // Allow unauthenticated requests but warn about rate limits
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(GRAPHQL_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  });

  // Handle 401 Unauthorized - logout and reload
  if (response.status === 401) {
    console.error('401 Unauthorized - logging out user');
    await AuthService.logout();
    window.location.href = '/';
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

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

import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime';
import { AuthService } from '../services/auth';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Custom fetch function for Relay to interact with the GitHub GraphQL API.
 *
 * Responsibilities:
 * 1. **Authentication**: Asynchronously retrieves the current session token from `AuthService`
 *    and attaches it as a Bearer token.
 * 2. **Unauthenticated Handling**: Warns if a request is made without a token, noting the stricter
 *    rate limits (60/hour vs 5000/hour).
 * 3. **Error Handling**:
 *    - Automatically logs out and redirects to home on 401 Unauthorized responses.
 *    - Throws errors for network failures or GraphQL-level errors.
 * 4. **Monitoring**: Logs GitHub API rate limit status from response headers.
 *
 * @param operation - The GraphQL operation (query/mutation) to execute.
 * @param variables - Variables required by the operation.
 * @returns A promise resolving to the GraphQL response payload.
 */
const fetchQuery: FetchFunction = async (operation, variables) => {
  // Buscar token da API (agora é async)
  const token = await AuthService.getToken();

  // Allow unauthenticated requests but warn about rate limits
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('Making unauthenticated request to GitHub API. Rate limits will be more restrictive (60 requests/hour vs 5000 with token).');
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
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

/**
 * The singleton Relay Environment instance.
 *
 * This environment is configured with:
 * - A custom Network layer that handles authentication and rate limiting (`fetchQuery`).
 * - A standard Store and RecordSource for caching GraphQL data.
 *
 * This instance should be provided to the `RelayEnvironmentProvider` at the root of the React application.
 */
export const relayEnvironment = createEnvironment();

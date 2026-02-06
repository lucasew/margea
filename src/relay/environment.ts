import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime';
import { AuthService } from '../services/auth';
import { rateLimitStore } from '../services/rateLimitStore';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const fetchQuery: FetchFunction = async (operation, variables) => {
  const token = await AuthService.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn(
      'Making unauthenticated request to GitHub API. Rate limits will be more restrictive (60 requests/hour vs 5000 with token).',
    );
  }

  const body = JSON.stringify({
    query: operation.text,
    variables,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;

    try {
      response = await fetch(GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers,
        body,
      });
    } catch (err) {
      // Network error (DNS, connection refused, etc.)
      if (attempt < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }

    // 401 Unauthorized — unrecoverable, don't retry
    if (response.status === 401) {
      console.error('401 Unauthorized - logging out user');
      await AuthService.logout();
      window.location.href = '/';
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // 429 or 403 (secondary rate limit) — retryable
    if (
      (response.status === 429 || response.status === 403) &&
      attempt < MAX_RETRIES
    ) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `Rate limited (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
      );
      await sleep(delay);
      continue;
    }

    const json = await response.json();

    // Update rate limit tracking
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (remaining && reset) {
      rateLimitStore.update(limit, remaining, reset);
    }

    if (!response.ok) {
      throw new Error(
        `Network error: ${response.status} ${response.statusText}`,
      );
    }

    if (json.errors) {
      console.error('GraphQL errors:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL error occurred');
    }

    return json;
  }

  throw new Error('Max retries exceeded');
};

function createEnvironment() {
  return new Environment({
    network: Network.create(fetchQuery),
    store: new Store(new RecordSource()),
  });
}

export const relayEnvironment = createEnvironment();
